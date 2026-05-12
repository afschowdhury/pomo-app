import { create } from 'zustand';
import { builtInAudioSources, createDefaultTimerState, defaultSettings } from '@/lib/defaults';
import { db, SETTINGS_KEY, TIMER_KEY } from '@/lib/db';
import {
  buildTimerForPhase,
  createSessionRecord,
  getPhaseDurationMs,
  getTransitionTarget,
  hasMeaningfulProgress,
  resolveRemainingMs,
} from '@/lib/pomodoro';
import type {
  AudioPlaybackStatus,
  AudioSource,
  PomodoroPhase,
  PomodoroSettings,
  SessionRecord,
  TaskItem,
  TaskSubtask,
  TimerState,
} from '@/types/domain';
import { cancelSessionAlarmRust, scheduleSessionAlarmRust } from '@/lib/tauriSessionAlarm';
import { clamp, generateId } from '@/lib/utils';

/** Dedupe concurrent natural-expiry completions (Rust alarm + JS interval). */
let lastCompletedNaturalEndsAt: number | null = null;
let naturalExpiryInFlight = false;

interface AppStore {
  hydrated: boolean;
  settings: PomodoroSettings;
  timer: TimerState;
  tasks: TaskItem[];
  sessions: SessionRecord[];
  audioSources: AudioSource[];
  selectedAudioSourceId: string | null;
  audioStatus: AudioPlaybackStatus;
  audioError: string | null;
  isSettingsOpen: boolean;
  isStatsOpen: boolean;
  isFocusMode: boolean;
  hydrate: () => Promise<void>;
  setSettingsOpen: (open: boolean) => void;
  setStatsOpen: (open: boolean) => void;
  setFocusMode: (focus: boolean) => void;
  setNotificationPermission: (permission: PomodoroSettings['notificationPermission']) => Promise<void>;
  updateSettings: (patch: Partial<PomodoroSettings>) => Promise<void>;
  setSelectedAudioSourceId: (id: string | null) => Promise<void>;
  setAudioStatus: (status: AudioPlaybackStatus, error?: string | null) => void;
  toggleAudioFavorite: (id: string) => Promise<void>;
  addCustomAudioSource: (payload: {
    label: string;
    url: string;
    mode: AudioSource['kind'];
  }) => Promise<void>;
  removeAudioSource: (id: string) => Promise<void>;
  addTask: (payload: { title: string; notes?: string; estimatePomodoros?: number }) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  setActiveTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  moveTask: (id: string, direction: -1 | 1) => Promise<void>;
  syncTimer: (now?: number) => Promise<void>;
  startTimer: (now?: number) => Promise<void>;
  pauseTimer: (now?: number) => Promise<void>;
  resetTimer: (now?: number) => Promise<void>;
  skipTimer: (now?: number) => Promise<void>;
  jumpToPhase: (phase: PomodoroPhase) => Promise<void>;
  completeCurrentPhase: (
    now?: number,
    options?: { completed?: boolean; interruptionReason?: SessionRecord['interruptionReason'] },
  ) => Promise<void>;
}

function sortTasks(tasks: TaskItem[]) {
  return [...tasks].sort((left, right) => {
    const statusRank: Record<TaskItem['status'], number> = {
      active: 0,
      queued: 1,
      completed: 2,
    };

    return statusRank[left.status] - statusRank[right.status] || left.order - right.order;
  });
}

function mergeAudioSources(sources: AudioSource[]) {
  const audioById = new Map(builtInAudioSources.map((source) => [source.id, source]));
  sources.forEach((source) => {
    if (source.provider !== 'custom' && source.provider !== 'system') {
      return;
    }

    audioById.set(source.id, { ...audioById.get(source.id), ...source });
  });

  return Array.from(audioById.values()).sort((left, right) => Number(right.isFavorite) - Number(left.isFavorite));
}

async function persistSettings(settings: PomodoroSettings) {
  await db.settings.put({ id: SETTINGS_KEY, value: settings });
}

async function persistTimer(timer: TimerState) {
  await db.timer.put({ id: TIMER_KEY, value: timer });
}

function chooseNextActiveTask(tasks: TaskItem[]) {
  return sortTasks(tasks).find((task) => task.status === 'queued') ?? null;
}

export function normalizeTaskSubtask(subtask: TaskSubtask): TaskSubtask {
  return {
    id: subtask.id,
    title: subtask.title,
    completed: Boolean(subtask.completed),
    createdAt: subtask.createdAt,
    updatedAt: subtask.updatedAt,
  };
}

export function normalizeTask(task: TaskItem): TaskItem {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks.map(normalizeTaskSubtask) : [];
  return {
    ...task,
    subtasks,
  };
}

export function addSubtaskToTask(task: TaskItem, title: string, now: number): TaskItem {
  return {
    ...task,
    subtasks: [
      ...task.subtasks,
      {
        id: generateId('subtask'),
        title,
        completed: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function toggleTaskSubtask(task: TaskItem, subtaskId: string, now: number): TaskItem {
  return {
    ...task,
    subtasks: task.subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed, updatedAt: now } : subtask,
    ),
    updatedAt: now,
  };
}

export function removeTaskSubtask(task: TaskItem, subtaskId: string, now: number): TaskItem {
  return {
    ...task,
    subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId),
    updatedAt: now,
  };
}

export const useAppStore = create<AppStore>((set, get) => ({
  hydrated: false,
  settings: defaultSettings,
  timer: createDefaultTimerState(defaultSettings),
  tasks: [],
  sessions: [],
  audioSources: builtInAudioSources,
  selectedAudioSourceId: defaultSettings.defaultAudioSourceId,
  audioStatus: 'idle',
  audioError: null,
  isSettingsOpen: false,
  isStatsOpen: false,
  isFocusMode: false,

  async hydrate() {
    if (get().hydrated) {
      return;
    }

    const [storedSettings, storedTimer, tasks, sessions, audioSources] = await Promise.all([
      db.settings.get(SETTINGS_KEY),
      db.timer.get(TIMER_KEY),
      db.tasks.toArray(),
      db.sessions.orderBy('endedAt').reverse().toArray(),
      db.audioSources.toArray(),
    ]);

    const settings = storedSettings?.value ?? defaultSettings;
    const timer = storedTimer?.value ?? createDefaultTimerState(settings);
    const staleAudioSourceIds = audioSources
      .filter((source) => source.provider !== 'custom' && source.provider !== 'system')
      .map((source) => source.id);
    const mergedAudioSources = mergeAudioSources(audioSources);
    const normalizedTasks = tasks.map(normalizeTask);
    const hasLegacyTasks = tasks.some((task) => !Array.isArray(task.subtasks));

    if (!storedSettings) {
      await persistSettings(settings);
    }

    if (!storedTimer) {
      await persistTimer(timer);
    }

    if (audioSources.length === 0) {
      await db.audioSources.bulkPut(mergedAudioSources);
    }

    if (staleAudioSourceIds.length > 0) {
      await db.audioSources.bulkDelete(staleAudioSourceIds);
    }

    if (hasLegacyTasks) {
      await db.tasks.bulkPut(normalizedTasks);
    }

    const hydratedTimer = {
      ...timer,
      remainingMs: resolveRemainingMs(timer, Date.now()),
    };

    set({
      hydrated: true,
      settings,
      timer: hydratedTimer,
      tasks: sortTasks(normalizedTasks),
      sessions,
      audioSources: mergedAudioSources,
      selectedAudioSourceId: settings.defaultAudioSourceId ?? mergedAudioSources[0]?.id ?? null,
    });

    if (hydratedTimer.isRunning && hydratedTimer.endsAt !== null) {
      await scheduleSessionAlarmRust(Math.max(0, hydratedTimer.endsAt - Date.now()));
    }
  },

  setSettingsOpen(open) {
    set({ isSettingsOpen: open });
  },

  setStatsOpen(open) {
    set({ isStatsOpen: open });
  },

  setFocusMode(focus) {
    set({ isFocusMode: focus });
  },

  async setNotificationPermission(permission) {
    const settings = { ...get().settings, notificationPermission: permission };
    set({ settings });
    await persistSettings(settings);
  },

  async updateSettings(patch) {
    const currentSettings = get().settings;
    const nextSettings: PomodoroSettings = {
      ...currentSettings,
      ...patch,
      workMinutes: clamp(Math.round(patch.workMinutes ?? currentSettings.workMinutes), 1, 90),
      shortBreakMinutes: clamp(
        Math.round(patch.shortBreakMinutes ?? currentSettings.shortBreakMinutes),
        1,
        30,
      ),
      longBreakMinutes: clamp(
        Math.round(patch.longBreakMinutes ?? currentSettings.longBreakMinutes),
        5,
        60,
      ),
      longBreakInterval: clamp(
        Math.round(patch.longBreakInterval ?? currentSettings.longBreakInterval),
        2,
        8,
      ),
      dailyGoalSessions: clamp(
        Math.round(patch.dailyGoalSessions ?? currentSettings.dailyGoalSessions),
        1,
        20,
      ),
      ambientVolume: clamp(patch.ambientVolume ?? currentSettings.ambientVolume, 0, 1),
    };

    const currentTimer = get().timer;
    const resetLikeState =
      !currentTimer.isRunning &&
      !currentTimer.startedAt &&
      currentTimer.remainingMs === getPhaseDurationMs(currentSettings, currentTimer.phase);
    const timer = resetLikeState
      ? buildTimerForPhase(currentTimer.phase, nextSettings, {
          cycleIndex: currentTimer.cycleIndex,
          activeTaskId: currentTimer.activeTaskId,
        })
      : currentTimer;

    set({
      settings: nextSettings,
      timer,
      selectedAudioSourceId: nextSettings.defaultAudioSourceId,
    });

    await Promise.all([persistSettings(nextSettings), persistTimer(timer)]);
  },

  async setSelectedAudioSourceId(id) {
    const settings = { ...get().settings, defaultAudioSourceId: id };
    set({ selectedAudioSourceId: id, settings });
    await persistSettings(settings);
  },

  setAudioStatus(status, error = null) {
    set({ audioStatus: status, audioError: error });
  },

  async toggleAudioFavorite(id) {
    const nextSources = get().audioSources.map((source) =>
      source.id === id ? { ...source, isFavorite: !source.isFavorite } : source,
    );
    const orderedSources = mergeAudioSources(nextSources);
    const updatedSource = orderedSources.find((source) => source.id === id);

    set({ audioSources: orderedSources });

    if (updatedSource) {
      await db.audioSources.put(updatedSource);
    }
  },

  async addCustomAudioSource({ label, url, mode }) {
    const source: AudioSource = {
      id: generateId('audio'),
      label,
      provider: 'custom',
      kind: mode,
      launchUrl: mode === 'external_companion' ? url : null,
      streamUrl: mode === 'direct_stream' ? url : null,
      embedUrl: mode === 'embed_frame' ? url : null,
      stationKey: null,
      capabilities: {
        canPlayInline: mode === 'direct_stream',
        canEmbed: mode === 'embed_frame',
        canLaunch: mode === 'external_companion',
      },
      isFavorite: false,
      builtIn: false,
      description: 'User-added custom source',
    };

    const audioSources = mergeAudioSources([...get().audioSources, source]);
    set({ audioSources, selectedAudioSourceId: source.id });

    await db.audioSources.put(source);
    await get().setSelectedAudioSourceId(source.id);
  },

  async removeAudioSource(id) {
    const source = get().audioSources.find((item) => item.id === id);
    if (!source || source.builtIn) {
      return;
    }

    const audioSources = get().audioSources.filter((item) => item.id !== id);
    const fallbackSourceId =
      get().selectedAudioSourceId === id ? audioSources.find(Boolean)?.id ?? null : get().selectedAudioSourceId;

    set({ audioSources, selectedAudioSourceId: fallbackSourceId });

    await Promise.all([db.audioSources.delete(id), get().setSelectedAudioSourceId(fallbackSourceId)]);
  },

  async addTask({ title, notes = '', estimatePomodoros = 1 }) {
    const tasks = get().tasks;
    const activeTask = tasks.find((task) => task.status === 'active');
    const task: TaskItem = {
      id: generateId('task'),
      title,
      notes,
      estimatePomodoros: clamp(Math.round(estimatePomodoros), 1, 12),
      completedPomodoros: 0,
      subtasks: [],
      status: activeTask ? 'queued' : 'active',
      order: tasks.filter((task) => task.status !== 'completed').length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const nextTasks = sortTasks([...tasks, task]);
    const timer =
      task.status === 'active' ? { ...get().timer, activeTaskId: task.id } : get().timer;

    set({ tasks: nextTasks, timer });
    await Promise.all([db.tasks.put(task), persistTimer(timer)]);
  },

  async addSubtask(taskId, title) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const now = Date.now();
    let updatedTask: TaskItem | null = null;
    const nextTasks = get().tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      updatedTask = addSubtaskToTask(task, trimmedTitle, now);
      return updatedTask;
    });

    if (!updatedTask) {
      return;
    }

    set({ tasks: nextTasks });
    await db.tasks.put(updatedTask);
  },

  async toggleSubtask(taskId, subtaskId) {
    const now = Date.now();
    let updatedTask: TaskItem | null = null;
    const nextTasks = get().tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      updatedTask = toggleTaskSubtask(task, subtaskId, now);
      return updatedTask;
    });

    if (!updatedTask) {
      return;
    }

    set({ tasks: nextTasks });
    await db.tasks.put(updatedTask);
  },

  async removeSubtask(taskId, subtaskId) {
    const now = Date.now();
    let updatedTask: TaskItem | null = null;
    const nextTasks = get().tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      updatedTask = removeTaskSubtask(task, subtaskId, now);
      return updatedTask;
    });

    if (!updatedTask) {
      return;
    }

    set({ tasks: nextTasks });
    await db.tasks.put(updatedTask);
  },

  async setActiveTask(id) {
    const tasks = sortTasks(
      get().tasks.map((task) => {
        if (task.status === 'completed') {
          return task;
        }

        return {
          ...task,
          status: task.id === id ? 'active' : 'queued',
          updatedAt: Date.now(),
        };
      }),
    );
    const timer = { ...get().timer, activeTaskId: id };

    set({ tasks, timer });
    await Promise.all([db.tasks.bulkPut(tasks), persistTimer(timer)]);
  },

  async completeTask(id) {
    let nextActiveTaskId: string | null = null;
    const tasks = get().tasks.map((task) => {
      if (task.id !== id) {
        return task;
      }

      return {
        ...task,
        status: 'completed' as const,
        updatedAt: Date.now(),
      };
    });
    const candidate = chooseNextActiveTask(tasks);
    const normalized = sortTasks(
      tasks.map((task) => {
        if (task.status === 'completed') {
          return task;
        }

        if (candidate && task.id === candidate.id) {
          nextActiveTaskId = task.id;
          return { ...task, status: 'active', updatedAt: Date.now() };
        }

        return { ...task, status: 'queued', updatedAt: Date.now() };
      }),
    );
    const timer = { ...get().timer, activeTaskId: nextActiveTaskId };

    set({ tasks: normalized, timer });
    await Promise.all([db.tasks.bulkPut(normalized), persistTimer(timer)]);
  },

  async removeTask(id) {
    const remaining = get().tasks.filter((task) => task.id !== id);
    const nextActive = chooseNextActiveTask(remaining);
    const normalized = sortTasks(
      remaining.map((task) => {
        if (task.status === 'completed') {
          return task;
        }

        if (nextActive && task.id === nextActive.id) {
          return { ...task, status: 'active', updatedAt: Date.now() };
        }

        return { ...task, status: 'queued', updatedAt: Date.now() };
      }),
    );
    const timer = {
      ...get().timer,
      activeTaskId: nextActive?.id ?? null,
    };

    set({ tasks: normalized, timer });
    await Promise.all([db.tasks.delete(id), db.tasks.bulkPut(normalized), persistTimer(timer)]);
  },

  async moveTask(id, direction) {
    const tasks = sortTasks(get().tasks);
    const movable = tasks.filter((task) => task.status !== 'completed');
    const index = movable.findIndex((task) => task.id === id);
    const swapIndex = index + direction;

    if (index === -1 || swapIndex < 0 || swapIndex >= movable.length) {
      return;
    }

    const reordered = [...movable];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    const orderMap = new Map(reordered.map((task, taskIndex) => [task.id, taskIndex]));
    const nextTasks = sortTasks(
      tasks.map((task) =>
        orderMap.has(task.id)
          ? { ...task, order: orderMap.get(task.id) ?? task.order, updatedAt: Date.now() }
          : task,
      ),
    );

    set({ tasks: nextTasks });
    await db.tasks.bulkPut(nextTasks);
  },

  async syncTimer(now = Date.now()) {
    const timer = get().timer;

    if (!timer.isRunning || timer.endsAt === null) {
      return;
    }

    const remainingMs = resolveRemainingMs(timer, now);
    if (remainingMs === timer.remainingMs) {
      return;
    }

    const nextTimer = { ...timer, remainingMs };
    set({ timer: nextTimer });
    await persistTimer(nextTimer);
  },

  async startTimer(now = Date.now()) {
    const timer = get().timer;
    const settings = get().settings;
    const remainingMs =
      timer.remainingMs <= 0 ? getPhaseDurationMs(settings, timer.phase) : timer.remainingMs;
    const nextTimer: TimerState = {
      ...timer,
      startedAt: timer.startedAt ?? now,
      endsAt: now + remainingMs,
      remainingMs,
      isRunning: true,
    };

    set({ timer: nextTimer });
    await persistTimer(nextTimer);
    await scheduleSessionAlarmRust(Math.max(0, nextTimer.endsAt! - now));
  },

  async pauseTimer(now = Date.now()) {
    await cancelSessionAlarmRust();

    const timer = get().timer;
    if (!timer.isRunning) {
      return;
    }

    const nextTimer: TimerState = {
      ...timer,
      endsAt: null,
      isRunning: false,
      remainingMs: resolveRemainingMs(timer, now),
    };

    set({ timer: nextTimer });
    await persistTimer(nextTimer);
  },

  async resetTimer(now = Date.now()) {
    await cancelSessionAlarmRust();

    const { timer, settings } = get();
    let sessions = get().sessions;

    if (hasMeaningfulProgress(timer, settings, now)) {
      const session = createSessionRecord(timer, settings, now, false, 'reset');
      sessions = [session, ...sessions];
      await db.sessions.put(session);
    }

    const nextTimer = buildTimerForPhase(timer.phase, settings, {
      cycleIndex: timer.cycleIndex,
      activeTaskId: timer.activeTaskId,
    });

    set({ timer: nextTimer, sessions });
    await persistTimer(nextTimer);
  },

  async skipTimer(now = Date.now()) {
    await get().completeCurrentPhase(now, {
      completed: false,
      interruptionReason: 'skipped',
    });
  },

  async jumpToPhase(phase) {
    await cancelSessionAlarmRust();

    const { timer, settings } = get();
    const nextTimer = buildTimerForPhase(phase, settings, {
      cycleIndex: timer.cycleIndex,
      activeTaskId: timer.activeTaskId,
    });

    set({ timer: nextTimer });
    await persistTimer(nextTimer);
  },

  async completeCurrentPhase(
    now = Date.now(),
    { completed = true, interruptionReason }: { completed?: boolean; interruptionReason?: SessionRecord['interruptionReason'] } = {},
  ) {
    const { timer, settings, tasks } = get();
    const isNaturalExpiry =
      timer.isRunning &&
      timer.endsAt !== null &&
      timer.endsAt <= now &&
      interruptionReason === undefined;

    const capturedNaturalEndsAt = isNaturalExpiry ? timer.endsAt : null;

    if (isNaturalExpiry) {
      if (lastCompletedNaturalEndsAt === timer.endsAt) {
        return;
      }
      if (naturalExpiryInFlight) {
        return;
      }
      naturalExpiryInFlight = true;
    }

    await cancelSessionAlarmRust();

    let nextNormalizedTimer: TimerState | null = null;

    try {
      let nextTasks = tasks;
      let nextSessions = get().sessions;

      if (hasMeaningfulProgress(timer, settings, now)) {
        const session = createSessionRecord(timer, settings, now, completed, interruptionReason);
        nextSessions = [session, ...nextSessions];
        await db.sessions.put(session);
      }

      if (timer.phase === 'work' && completed && timer.activeTaskId) {
        nextTasks = sortTasks(
          tasks.map((task) => {
            if (task.id !== timer.activeTaskId) {
              return task;
            }

            const completedPomodoros = task.completedPomodoros + 1;
            const shouldComplete = completedPomodoros >= task.estimatePomodoros;

            return {
              ...task,
              completedPomodoros,
              status: shouldComplete ? ('completed' as const) : task.status,
              updatedAt: now,
            };
          }),
        );

        if (nextTasks.some((task) => task.id === timer.activeTaskId && task.status === 'completed')) {
          const nextActiveTask = chooseNextActiveTask(nextTasks);
          nextTasks = sortTasks(
            nextTasks.map((task) => {
              if (task.status === 'completed') {
                return task;
              }

              if (nextActiveTask && task.id === nextActiveTask.id) {
                return { ...task, status: 'active', updatedAt: now };
              }

              return { ...task, status: 'queued', updatedAt: now };
            }),
          );
        }
      }

      const { nextTimer } = getTransitionTarget(timer, settings, now, completed);
      const activeTask =
        nextTasks.find((task) => task.status === 'active') ??
        nextTasks.find((task) => task.status === 'queued') ??
        null;
      const normalizedTimer = {
        ...nextTimer,
        activeTaskId: activeTask?.id ?? null,
      };

      set({
        timer: normalizedTimer,
        tasks: nextTasks,
        sessions: nextSessions,
      });

      await Promise.all([persistTimer(normalizedTimer), db.tasks.bulkPut(nextTasks)]);
      nextNormalizedTimer = normalizedTimer;
    } finally {
      if (isNaturalExpiry) {
        naturalExpiryInFlight = false;
      }
    }

    if (isNaturalExpiry && capturedNaturalEndsAt !== null) {
      lastCompletedNaturalEndsAt = capturedNaturalEndsAt;
    }

    if (nextNormalizedTimer?.isRunning && nextNormalizedTimer.endsAt !== null) {
      await scheduleSessionAlarmRust(Math.max(0, nextNormalizedTimer.endsAt - Date.now()));
    }
  },
}));
