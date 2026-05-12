import { useEffect, useRef } from 'react';
import type { TrayIcon } from '@tauri-apps/api/tray';
import { isTauriRuntime } from '@/lib/audio';
import { formatDuration, resolveRemainingMs } from '@/lib/pomodoro';
import { useAppStore } from '@/store/useAppStore';

const TRAY_ID = 'still-pomodoro-tray';

function phaseTitleGlyph(phase: 'work' | 'short_break' | 'long_break') {
  if (phase === 'work') {
    return '●';
  }
  return '○';
}

async function focusMainWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.unminimize().catch(() => undefined);
    await appWindow.show();
    await appWindow.setFocus();
  } catch (error) {
    console.error('[menu-bar-timer] focusMainWindow failed', error);
  }
}

export function useMenuBarTimer() {
  const hydrated = useAppStore((state) => state.hydrated);
  const trayRef = useRef<TrayIcon | null>(null);

  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    void (async () => {
      try {
        const { TrayIcon } = await import('@tauri-apps/api/tray');
        const existing = await TrayIcon.getById(TRAY_ID);
        if (cancelled) {
          return;
        }

        let tray: TrayIcon;
        if (existing) {
          tray = existing;
        } else {
          const { default: trayIconUrl } = await import('@tauri-icons/32x32.png?url');
          const response = await fetch(trayIconUrl);
          if (!response.ok) {
            throw new Error(`Tray icon fetch failed: ${response.status}`);
          }
          const iconBytes = new Uint8Array(await response.arrayBuffer());
          tray = await TrayIcon.new({
            id: TRAY_ID,
            icon: iconBytes,
            iconAsTemplate: true,
            tooltip: 'Still Pomodoro',
            showMenuOnLeftClick: false,
            action: (event) => {
              if (event.type === 'Click' && event.button === 'Left' && event.buttonState === 'Up') {
                void focusMainWindow();
              }
            },
          });
        }

        if (cancelled) {
          await tray.close();
          return;
        }

        trayRef.current = tray;

        const syncTray = () => {
          if (cancelled) {
            return;
          }
          const t = trayRef.current;
          if (!t) {
            return;
          }

          const timer = useAppStore.getState().timer;
          void (async () => {
            try {
              if (!timer.isRunning) {
                await t.setTitle(null);
                await t.setVisible(false);
                return;
              }

              const remainingMs = resolveRemainingMs(timer, Date.now());
              const label = `${phaseTitleGlyph(timer.phase)} ${formatDuration(remainingMs)}`;
              await t.setTitle(label);
              await t.setVisible(true);
            } catch (error) {
              console.error('[menu-bar-timer] Failed to update tray', error);
            }
          })();
        };

        syncTray();
        intervalId = window.setInterval(syncTray, 1000);
      } catch (error) {
        console.error('[menu-bar-timer] Failed to create tray icon', error);
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      const t = trayRef.current;
      trayRef.current = null;
      if (t) {
        void t.close();
      }
    };
  }, [hydrated]);
}
