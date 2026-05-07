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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void syncTimer();
    }, 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncTimer();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [hydrated, syncTimer]);

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
