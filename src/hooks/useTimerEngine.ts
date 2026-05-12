import { useEffect, useRef } from 'react';
import { notifyPhaseChange, playNotificationCue } from '@/lib/audio';
import { phaseLabels } from '@/lib/pomodoro';
import { useAppStore } from '@/store/useAppStore';

export function useTimerEngine() {
  const hydrated = useAppStore((state) => state.hydrated);
  const timer = useAppStore((state) => state.timer);
  const settings = useAppStore((state) => state.settings);
  const syncTimer = useAppStore((state) => state.syncTimer);
  const completeCurrentPhase = useAppStore((state) => state.completeCurrentPhase);
  const previousPhaseRef = useRef(timer.phase);
  const previousRunningRef = useRef(timer.isRunning);
  /** Avoid duplicate `completeCurrentPhase` calls when interval and focus handler race. */
  const firedForEndsAtRef = useRef<number | null>(null);

  useEffect(() => {
    firedForEndsAtRef.current = null;
  }, [timer.endsAt, timer.isRunning, timer.phase]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const tryCompleteExpiredPhase = () => {
      const { timer: live } = useAppStore.getState();
      const now = Date.now();

      if (!live.isRunning || live.endsAt === null) {
        firedForEndsAtRef.current = null;
        return;
      }

      if (live.endsAt > now) {
        return;
      }

      if (firedForEndsAtRef.current === live.endsAt) {
        return;
      }

      firedForEndsAtRef.current = live.endsAt;
      void completeCurrentPhase();
    };

    const tick = () => {
      void syncTimer().then(tryCompleteExpiredPhase);
    };

    const intervalId = window.setInterval(tick, 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncTimer().then(tryCompleteExpiredPhase);
      }
    };

    const onFocus = () => {
      void syncTimer().then(tryCompleteExpiredPhase);
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [hydrated, syncTimer, completeCurrentPhase]);

  useEffect(() => {
    if (!hydrated || !timer.isRunning || timer.endsAt === null) {
      return;
    }

    if (timer.endsAt <= Date.now()) {
      void completeCurrentPhase();
    }
  }, [completeCurrentPhase, hydrated, timer.endsAt, timer.isRunning]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const phaseChanged = previousPhaseRef.current !== timer.phase;
    const runningChanged = previousRunningRef.current !== timer.isRunning;

    if (phaseChanged) {
      previousPhaseRef.current = timer.phase;
      const phaseKind = timer.phase === 'work' ? 'focus' : 'break';

      if (settings.soundEnabled) {
        void playNotificationCue(phaseKind, 0.14);
      }

      notifyPhaseChange(
        `${phaseLabels[timer.phase]} started`,
        timer.phase === 'work'
          ? 'Settle in. Your next focus block is ready.'
          : 'Time to step away for a few minutes.',
      );
    }

    if (runningChanged) {
      previousRunningRef.current = timer.isRunning;
    }
  }, [hydrated, settings.soundEnabled, timer.isRunning, timer.phase]);
}
