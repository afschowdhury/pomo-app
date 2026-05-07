import { ChartColumn, Fullscreen, Settings2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { DailyStrip } from '@/components/DailyStrip';
import { SessionEndAlert } from '@/components/SessionEndAlert';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { StatsDrawer } from '@/components/StatsDrawer';
import { TaskPanel } from '@/components/TaskPanel';
import { TimerCard } from '@/components/TimerCard';
import { getPhaseDurationMs, phaseLabels, resolveProgress } from '@/lib/pomodoro';
import { getCurrentStreak, getTodaySummary, getWeeklyFocus } from '@/lib/stats';
import { useHydrateApp } from '@/hooks/useHydrateApp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSessionAlarm } from '@/hooks/useSessionAlarm';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import { useAppStore } from '@/store/useAppStore';

export default function App() {
  useHydrateApp();
  useTimerEngine();
  useKeyboardShortcuts();

  const hydrated = useAppStore((state) => state.hydrated);
  const settings = useAppStore((state) => state.settings);
  const timer = useAppStore((state) => state.timer);
  const tasks = useAppStore((state) => state.tasks);
  const sessions = useAppStore((state) => state.sessions);
  const isSettingsOpen = useAppStore((state) => state.isSettingsOpen);
  const isStatsOpen = useAppStore((state) => state.isStatsOpen);
  const isFocusMode = useAppStore((state) => state.isFocusMode);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const setStatsOpen = useAppStore((state) => state.setStatsOpen);
  const setFocusMode = useAppStore((state) => state.setFocusMode);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setNotificationPermission = useAppStore((state) => state.setNotificationPermission);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resetTimer = useAppStore((state) => state.resetTimer);
  const skipTimer = useAppStore((state) => state.skipTimer);
  const jumpToPhase = useAppStore((state) => state.jumpToPhase);
  const addTask = useAppStore((state) => state.addTask);
  const addSubtask = useAppStore((state) => state.addSubtask);
  const toggleSubtask = useAppStore((state) => state.toggleSubtask);
  const removeSubtask = useAppStore((state) => state.removeSubtask);
  const setActiveTask = useAppStore((state) => state.setActiveTask);
  const completeTask = useAppStore((state) => state.completeTask);
  const removeTask = useAppStore((state) => state.removeTask);
  const moveTask = useAppStore((state) => state.moveTask);
  const { alertState, snooze, stop } = useSessionAlarm();

  const currentTask = tasks.find((task) => task.status === 'active') ?? null;
  const todaySummary = useMemo(
    () => getTodaySummary(sessions, settings.dailyGoalSessions),
    [sessions, settings.dailyGoalSessions],
  );
  const streak = useMemo(() => getCurrentStreak(sessions), [sessions]);
  const weeklyFocus = useMemo(() => getWeeklyFocus(sessions), [sessions]);
  const progress = useMemo(() => resolveProgress(timer, settings, Date.now()), [settings, timer]);

  useEffect(() => {
    const syncFullscreenState = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setFocusMode(false);
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
    };
  }, [isFocusMode, setFocusMode]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (isFocusMode) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [hydrated, isFocusMode]);

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      await setNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    await setNotificationPermission(permission);
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="rounded-[32px] border border-white/60 bg-white/70 px-8 py-10 shadow-editorial">
          <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">Still Pomodoro</p>
          <h1 className="mt-3 font-display text-5xl text-ink">Loading your workspace...</h1>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-canvas text-ink">
        <div className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-grain opacity-90" />
          <div className="pointer-events-none absolute left-[8%] top-16 h-56 w-56 rounded-full bg-[#edd6ca] blur-3xl" />
          <div className="pointer-events-none absolute right-[6%] top-28 h-72 w-72 rounded-full bg-[#dae6de] blur-3xl" />

          <div className="relative mx-auto flex min-h-screen max-w-[1460px] flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            {!isFocusMode ? (
              <header className="animate-appear">
                <div className="flex flex-col gap-6 rounded-[32px] border border-white/60 bg-white/55 px-5 py-5 shadow-editorial backdrop-blur md:flex-row md:items-end md:justify-between md:px-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.38em] text-dusk/70">Still Pomodoro</p>
                    <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight text-ink md:text-6xl">
                      A refined focus room with modern pomodoro flow and unmistakable session alerts.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base text-dusk/85">
                      Timer, tasks, streaks, PWA-ready persistence, and a session-finished alarm you must snooze or
                      stop yourself.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
                      onClick={() => setFocusMode(true)}
                    >
                      <Fullscreen size={16} />
                      Focus mode
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
                      onClick={() => setStatsOpen(true)}
                    >
                      <ChartColumn size={16} />
                      Stats
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings2 size={16} />
                      Settings
                    </button>
                  </div>
                </div>
              </header>
            ) : (
              <header className="mb-6 flex items-center justify-between rounded-[28px] border border-white/60 bg-white/50 px-5 py-4 backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">Focus Mode</p>
                  <h2 className="font-display text-3xl text-ink">{phaseLabels[timer.phase]}</h2>
                </div>
                <button
                  className="rounded-full border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
                  onClick={() => setFocusMode(false)}
                >
                  Exit focus mode
                </button>
              </header>
            )}

            {!isFocusMode ? (
              <>
                <div className="mt-6">
                  <DailyStrip
                    completedSessions={todaySummary.completedSessions}
                    focusMinutes={todaySummary.focusMinutes}
                    streak={streak}
                    goal={settings.dailyGoalSessions}
                  />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <TimerCard
                    timer={timer}
                    progress={progress}
                    currentTaskTitle={currentTask?.title ?? null}
                    phaseDurationLabel={`${phaseLabels[timer.phase]} block · ${Math.round(
                      getPhaseDurationMs(settings, timer.phase) / 60_000,
                    )} minutes`}
                    onStart={() => void startTimer()}
                    onPause={() => void pauseTimer()}
                    onReset={() => void resetTimer()}
                    onSkip={() => void skipTimer()}
                    onPhaseSelect={(phase) => void jumpToPhase(phase)}
                  />

                  <TaskPanel
                    tasks={tasks}
                    onAddTask={(payload) => void addTask(payload)}
                    onAddSubtask={(taskId, title) => void addSubtask(taskId, title)}
                    onToggleSubtask={(taskId, subtaskId) => void toggleSubtask(taskId, subtaskId)}
                    onRemoveSubtask={(taskId, subtaskId) => void removeSubtask(taskId, subtaskId)}
                    onActivateTask={(id) => void setActiveTask(id)}
                    onCompleteTask={(id) => void completeTask(id)}
                    onMoveTask={(id, direction) => void moveTask(id, direction)}
                    onRemoveTask={(id) => void removeTask(id)}
                  />
                </div>
              </>
            ) : (
              <section className="mx-auto mt-10 w-full max-w-4xl">
                <TimerCard
                  timer={timer}
                  progress={progress}
                  currentTaskTitle={currentTask?.title ?? null}
                  phaseDurationLabel={`${phaseLabels[timer.phase]} block · ${Math.round(
                    getPhaseDurationMs(settings, timer.phase) / 60_000,
                  )} minutes`}
                  onStart={() => void startTimer()}
                  onPause={() => void pauseTimer()}
                  onReset={() => void resetTimer()}
                  onSkip={() => void skipTimer()}
                  onPhaseSelect={(phase) => void jumpToPhase(phase)}
                />
              </section>
            )}
          </div>
        </div>
      </main>

      <SettingsDrawer
        open={isSettingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={(patch) => void updateSettings(patch)}
        onRequestNotifications={() => void requestNotifications()}
      />
      <StatsDrawer
        open={isStatsOpen}
        onClose={() => setStatsOpen(false)}
        completedSessions={todaySummary.completedSessions}
        focusMinutes={todaySummary.focusMinutes}
        breakMinutes={todaySummary.breakMinutes}
        streak={streak}
        weeklyFocus={weeklyFocus}
      />
      <SessionEndAlert
        open={Boolean(alertState)}
        phaseLabel={alertState ? phaseLabels[alertState.phase] : ''}
        message={alertState?.body ?? ''}
        onSnooze={snooze}
        onStop={stop}
      />
    </>
  );
}
