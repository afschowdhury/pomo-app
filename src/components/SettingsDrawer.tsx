import { Bell, Clock3 } from 'lucide-react';
import { Drawer } from '@/components/Drawer';
import type { PomodoroSettings } from '@/types/domain';

interface SettingsDrawerProps {
  open: boolean;
  settings: PomodoroSettings;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<PomodoroSettings>) => void;
  onRequestNotifications: () => void;
  onSendTestNotification: () => void;
}

const numberFields: Array<{
  key: keyof Pick<
    PomodoroSettings,
    'workMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakInterval' | 'dailyGoalSessions'
  >;
  label: string;
  icon: typeof Clock3;
}> = [
  { key: 'workMinutes', label: 'Focus length', icon: Clock3 },
  { key: 'shortBreakMinutes', label: 'Short break', icon: Clock3 },
  { key: 'longBreakMinutes', label: 'Long break', icon: Clock3 },
  { key: 'longBreakInterval', label: 'Long break cadence', icon: Clock3 },
  { key: 'dailyGoalSessions', label: 'Daily goal', icon: Clock3 },
];

export function SettingsDrawer({
  open,
  settings,
  onClose,
  onUpdateSettings,
  onRequestNotifications,
  onSendTestNotification,
}: SettingsDrawerProps) {
  return (
    <Drawer open={open} title="Settings" onClose={onClose}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-white/70 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#e6f0ea] p-3 text-pine">
              <Clock3 size={18} />
            </span>
            <div>
              <h3 className="font-display text-2xl text-ink">Timing</h3>
              <p className="text-sm text-dusk/80">Tune the cadence without losing the current app state.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {numberFields.map(({ key, label, icon: Icon }) => (
              <label key={key} className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Icon size={14} />
                  {label}
                </span>
                <input
                  type="number"
                  min={1}
                  max={key === 'dailyGoalSessions' ? 20 : 90}
                  value={settings[key]}
                  onChange={(event) => onUpdateSettings({ [key]: Number(event.target.value) })}
                  className="w-full rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-ink outline-none transition focus:border-blush/50"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/70 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#f2dfd5] p-3 text-blush">
              <Bell size={18} />
            </span>
            <div>
              <h3 className="font-display text-2xl text-ink">Session behavior</h3>
              <p className="text-sm text-dusk/80">Control auto-start and notifications.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3">
              <div>
                <p className="font-medium text-ink">Auto-start breaks</p>
                <p className="text-sm text-dusk/75">Roll straight into rest after a completed focus block.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStartBreaks}
                onChange={(event) => onUpdateSettings({ autoStartBreaks: event.target.checked })}
                className="h-5 w-5 accent-blush"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3">
              <div>
                <p className="font-medium text-ink">Auto-start focus blocks</p>
                <p className="text-sm text-dusk/75">Resume work automatically when breaks expire.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStartPomodoros}
                onChange={(event) => onUpdateSettings({ autoStartPomodoros: event.target.checked })}
                className="h-5 w-5 accent-blush"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3">
              <div>
                <p className="font-medium text-ink">Play session alarm</p>
                <p className="text-sm text-dusk/75">Loop the alarm after a session ends until you snooze or stop it.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(event) => onUpdateSettings({ soundEnabled: event.target.checked })}
                className="h-5 w-5 accent-blush"
              />
            </label>
            <div className="rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">macOS notifications</p>
                  <p className="text-sm text-dusk/75">
                    Permission status: <span className="capitalize">{settings.notificationPermission}</span>
                  </p>
                  <p className="mt-1 text-sm text-dusk/75">
                    Grant access so the session-finished alert stays visible even when Still Pomodoro is in the
                    background or behind another window.
                  </p>
                </div>
                <button
                  className="rounded-full bg-ink px-4 py-2 text-sm text-canvas transition hover:bg-pine"
                  onClick={onRequestNotifications}
                  disabled={
                    settings.notificationPermission === 'unsupported' ||
                    settings.notificationPermission === 'granted'
                  }
                >
                  Request access
                </button>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
                  onClick={onSendTestNotification}
                  disabled={settings.notificationPermission !== 'granted'}
                >
                  Send test notification
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Drawer>
  );
}
