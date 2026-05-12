import { useEffect, useRef, useState } from 'react';
import { getAlarmToneDataUrl, isTauriRuntime, notifySessionFinished } from '@/lib/audio';
import { phaseLabels, resolveRemainingMs } from '@/lib/pomodoro';
import { forceFocusWindowRust } from '@/lib/tauriSessionAlarm';
import type { PomodoroPhase } from '@/types/domain';
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

type TauriRestoreState = { wasFullscreen: boolean };

export function useSessionAlarm() {
  const hydrated = useAppStore((state) => state.hydrated);
  const sessions = useAppStore((state) => state.sessions);
  const soundEnabled = useAppStore((state) => state.settings.soundEnabled);
  const [alertState, setAlertState] = useState<null | { phase: PomodoroPhase; body: string }>(null);
  const lastAlertedSessionIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const snoozeTimeoutRef = useRef<number | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>('');
  const tauriRestoreRef = useRef<TauriRestoreState | null>(null);

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

  const releaseFullscreenTakeover = async () => {
    if (!isTauriRuntime()) {
      tauriRestoreRef.current = null;
      return;
    }

    const restore = tauriRestoreRef.current;
    tauriRestoreRef.current = null;
    if (!restore) {
      return;
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.setAlwaysOnTop(false);
      await appWindow.setFullscreen(restore.wasFullscreen);
      void appWindow.requestUserAttention(null).catch(() => undefined);
    } catch (error) {
      console.error('[session-alarm] releaseFullscreenTakeover failed', error);
    }
  };

  const forceFullscreenTakeover = async () => {
    try {
      window.focus();
    } catch {
      // Ignore if runtime blocks direct focus.
    }

    if (!isTauriRuntime()) {
      return;
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      const wasFullscreen = await appWindow.isFullscreen().catch(() => false);
      tauriRestoreRef.current = { wasFullscreen };
      await forceFocusWindowRust();
    } catch (error) {
      console.error('[session-alarm] forceFullscreenTakeover failed', error);
    }
  };

  const startAlarm = async (phase: PomodoroPhase, body: string) => {
    setAlertState({ phase, body });
    await forceFullscreenTakeover();

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
    if (!hydrated || !isTauriRuntime()) {
      return;
    }

    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen('session-alarm-fired', () => {
          const { timer, completeCurrentPhase } = useAppStore.getState();
          if (!timer.isRunning || timer.endsAt === null || resolveRemainingMs(timer, Date.now()) > 0) {
            return;
          }
          void completeCurrentPhase();
        });
      } catch (error) {
        console.error('[session-alarm] listen session-alarm-fired failed', error);
      }
    })();

    return () => {
      unlisten?.();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const latestSession = sessions[0];
    if (!latestSession?.completed || latestSession.id === lastAlertedSessionIdRef.current) {
      return;
    }

    lastAlertedSessionIdRef.current = latestSession.id;
    if (snoozeTimeoutRef.current !== null) {
      window.clearTimeout(snoozeTimeoutRef.current);
      snoozeTimeoutRef.current = null;
    }

    const { body } = getAlarmCopy(latestSession.phase);
    void startAlarm(latestSession.phase, body);
  }, [hydrated, sessions]);

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

  useEffect(
    () => () => {
      stopAlarm();
      if (snoozeTimeoutRef.current !== null) {
        window.clearTimeout(snoozeTimeoutRef.current);
      }
      void releaseFullscreenTakeover();
    },
    [],
  );

  return {
    alertState,
    test: () => {
      const { body } = getAlarmCopy('work');
      void startAlarm('work', `Test alert. ${body}`);
    },
    stop: () => {
      if (snoozeTimeoutRef.current !== null) {
        window.clearTimeout(snoozeTimeoutRef.current);
        snoozeTimeoutRef.current = null;
      }
      stopAlarm();
      setAlertState(null);
      void releaseFullscreenTakeover();
    },
    snooze: () => {
      const currentAlert = alertState;
      if (!currentAlert) {
        return;
      }

      stopAlarm();
      setAlertState(null);
      void releaseFullscreenTakeover();

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
