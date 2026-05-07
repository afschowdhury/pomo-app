import { useEffect, useRef, useState } from 'react';
import { getAlarmToneDataUrl, notifySessionFinished } from '@/lib/audio';
import { phaseLabels } from '@/lib/pomodoro';
import type { PomodoroPhase, TimerState } from '@/types/domain';
import { useAppStore } from '@/store/useAppStore';

const SNOOZE_MS = 5 * 60_000;

function getAlarmCopy(phase: PomodoroPhase) {
  if (phase === 'work') {
    return {
      title: 'Focus session complete',
      body: 'Your focus block ended. Start your break when you are ready.',
    };
  }

  return {
    title: 'Break complete',
    body: 'Your break ended. It is time to return to work.',
  };
}

function wasNaturalCompletion(previousTimer: TimerState, now: number) {
  return (
    previousTimer.isRunning &&
    previousTimer.endsAt !== null &&
    previousTimer.endsAt <= now + 1_500
  );
}

export function useSessionAlarm() {
  const hydrated = useAppStore((state) => state.hydrated);
  const timer = useAppStore((state) => state.timer);
  const soundEnabled = useAppStore((state) => state.settings.soundEnabled);
  const [alertState, setAlertState] = useState<null | { phase: PomodoroPhase; body: string }>(null);
  const previousTimerRef = useRef(timer);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const snoozeTimeoutRef = useRef<number | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>('');

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (titleIntervalRef.current !== null) {
      window.clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
      document.title = originalTitleRef.current || document.title;
    }
  };

  const startAlarm = async (phase: PomodoroPhase, body: string) => {
    setAlertState({ phase, body });

    if (typeof document !== 'undefined' && titleIntervalRef.current === null) {
      originalTitleRef.current = document.title;
      let flash = false;
      titleIntervalRef.current = window.setInterval(() => {
        flash = !flash;
        document.title = flash ? 'Session finished' : `Still Pomodoro · ${phaseLabels[phase]} done`;
      }, 1200);
    }

    const { title } = getAlarmCopy(phase);
    void notifySessionFinished(title, body);

    if (!soundEnabled || typeof window === 'undefined') {
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(getAlarmToneDataUrl());
      audioRef.current.loop = true;
      audioRef.current.volume = 0.85;
    }

    audioRef.current.currentTime = 0;

    try {
      await audioRef.current.play();
    } catch {
      // The webview may defer playback until the window is foregrounded.
    }
  };

  useEffect(() => {
    if (!hydrated) {
      previousTimerRef.current = timer;
      return;
    }

    const previousTimer = previousTimerRef.current;
    const phaseChanged = previousTimer.phase !== timer.phase;
    const now = Date.now();

    if (phaseChanged && wasNaturalCompletion(previousTimer, now)) {
      if (snoozeTimeoutRef.current !== null) {
        window.clearTimeout(snoozeTimeoutRef.current);
        snoozeTimeoutRef.current = null;
      }

      const { body } = getAlarmCopy(previousTimer.phase);
      void startAlarm(previousTimer.phase, body);
    }

    previousTimerRef.current = timer;
  }, [hydrated, soundEnabled, timer]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && alertState) {
        if (soundEnabled && audioRef.current) {
          void audioRef.current.play().catch(() => undefined);
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [alertState, soundEnabled]);

  useEffect(() => () => {
    stopAlarm();
    if (snoozeTimeoutRef.current !== null) {
      window.clearTimeout(snoozeTimeoutRef.current);
    }
  }, []);

  return {
    alertState,
    stop: () => {
      if (snoozeTimeoutRef.current !== null) {
        window.clearTimeout(snoozeTimeoutRef.current);
        snoozeTimeoutRef.current = null;
      }
      stopAlarm();
      setAlertState(null);
    },
    snooze: () => {
      const currentAlert = alertState;
      if (!currentAlert) {
        return;
      }

      stopAlarm();
      setAlertState(null);

      if (snoozeTimeoutRef.current !== null) {
        window.clearTimeout(snoozeTimeoutRef.current);
      }

      snoozeTimeoutRef.current = window.setTimeout(() => {
        const { body } = getAlarmCopy(currentAlert.phase);
        void startAlarm(currentAlert.phase, `${body} Snooze ended.`);
      }, SNOOZE_MS);
    },
  };
}
