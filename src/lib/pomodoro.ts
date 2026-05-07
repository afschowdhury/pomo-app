import type { PomodoroPhase, PomodoroSettings, SessionRecord, TimerState } from '@/types/domain';
import { generateId } from '@/lib/utils';

export const phaseLabels: Record<PomodoroPhase, string> = {
  work: 'Focus',
  short_break: 'Short break',
  long_break: 'Long break',
};

export function getPhaseDurationMs(settings: PomodoroSettings, phase: PomodoroPhase) {
  switch (phase) {
    case 'short_break':
      return settings.shortBreakMinutes * 60_000;
    case 'long_break':
      return settings.longBreakMinutes * 60_000;
    case 'work':
    default:
      return settings.workMinutes * 60_000;
  }
}

export function formatDuration(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function resolveRemainingMs(timer: TimerState, now: number) {
  if (!timer.isRunning || timer.endsAt === null) {
    return timer.remainingMs;
  }

  return Math.max(0, timer.endsAt - now);
}

export function resolveProgress(timer: TimerState, settings: PomodoroSettings, now: number) {
  const duration = getPhaseDurationMs(settings, timer.phase);
  const remaining = resolveRemainingMs(timer, now);
  const elapsed = duration - remaining;

  return duration <= 0 ? 0 : Math.min(100, Math.max(0, (elapsed / duration) * 100));
}

export function hasMeaningfulProgress(timer: TimerState, settings: PomodoroSettings, now: number) {
  const remaining = resolveRemainingMs(timer, now);
  return remaining < getPhaseDurationMs(settings, timer.phase);
}

export function getNextPhase(
  timer: TimerState,
  settings: PomodoroSettings,
  shouldCountCycle: boolean,
): { nextPhase: PomodoroPhase; nextCycleIndex: number } {
  if (timer.phase === 'work') {
    const nextCycleIndex = shouldCountCycle ? timer.cycleIndex + 1 : timer.cycleIndex;
    const nextPhase =
      shouldCountCycle && nextCycleIndex > 0 && nextCycleIndex % settings.longBreakInterval === 0
        ? 'long_break'
        : 'short_break';

    return { nextPhase, nextCycleIndex };
  }

  return {
    nextPhase: 'work',
    nextCycleIndex: timer.cycleIndex,
  };
}

export function buildTimerForPhase(
  phase: PomodoroPhase,
  settings: PomodoroSettings,
  overrides: Partial<TimerState> = {},
): TimerState {
  return {
    phase,
    startedAt: null,
    endsAt: null,
    remainingMs: getPhaseDurationMs(settings, phase),
    isRunning: false,
    cycleIndex: overrides.cycleIndex ?? 0,
    activeTaskId: overrides.activeTaskId ?? null,
    ...overrides,
  };
}

export function createSessionRecord(
  timer: TimerState,
  settings: PomodoroSettings,
  endedAt: number,
  completed: boolean,
  interruptionReason?: SessionRecord['interruptionReason'],
): SessionRecord {
  const phaseDuration = getPhaseDurationMs(settings, timer.phase);
  const elapsed = Math.max(0, phaseDuration - resolveRemainingMs(timer, endedAt));
  const startedAt = timer.startedAt ?? endedAt - elapsed;

  return {
    id: generateId('session'),
    phase: timer.phase,
    taskId: timer.activeTaskId,
    startedAt,
    endedAt,
    completed,
    interruptionReason,
  };
}

export function getTransitionTarget(
  timer: TimerState,
  settings: PomodoroSettings,
  endedAt: number,
  sessionCompleted: boolean,
) {
  const { nextPhase, nextCycleIndex } = getNextPhase(
    timer,
    settings,
    timer.phase === 'work' && sessionCompleted,
  );
  const duration = getPhaseDurationMs(settings, nextPhase);
  const shouldAutoStart =
    nextPhase === 'work' ? settings.autoStartPomodoros : settings.autoStartBreaks;

  return {
    nextTimer: {
      phase: nextPhase,
      startedAt: shouldAutoStart ? endedAt : null,
      endsAt: shouldAutoStart ? endedAt + duration : null,
      remainingMs: duration,
      isRunning: shouldAutoStart,
      cycleIndex: nextCycleIndex,
      activeTaskId: timer.activeTaskId,
    } satisfies TimerState,
    autoStarted: shouldAutoStart,
  };
}
