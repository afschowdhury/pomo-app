import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useKeyboardShortcuts() {
  const timer = useAppStore((state) => state.timer);
  const isSettingsOpen = useAppStore((state) => state.isSettingsOpen);
  const isStatsOpen = useAppStore((state) => state.isStatsOpen);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resetTimer = useAppStore((state) => state.resetTimer);
  const skipTimer = useAppStore((state) => state.skipTimer);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const setStatsOpen = useAppStore((state) => state.setStatsOpen);
  const setFocusMode = useAppStore((state) => state.setFocusMode);
  const isFocusMode = useAppStore((state) => state.isFocusMode);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        void (timer.isRunning ? pauseTimer() : startTimer());
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void resetTimer();
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void skipTimer();
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFocusMode(!isFocusMode);
      }

      if (event.key === ',') {
        event.preventDefault();
        setSettingsOpen(!isSettingsOpen);
      }

      if (event.key === '/') {
        event.preventDefault();
        setStatsOpen(!isStatsOpen);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    isFocusMode,
    isSettingsOpen,
    isStatsOpen,
    pauseTimer,
    resetTimer,
    setFocusMode,
    setSettingsOpen,
    setStatsOpen,
    skipTimer,
    startTimer,
    timer.isRunning,
  ]);
}
