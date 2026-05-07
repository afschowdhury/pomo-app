import { BarChart3, Coffee, Flame, Target } from 'lucide-react';
import { Drawer } from '@/components/Drawer';

interface StatsDrawerProps {
  open: boolean;
  onClose: () => void;
  completedSessions: number;
  focusMinutes: number;
  breakMinutes: number;
  streak: number;
  weeklyFocus: Array<{ dateLabel: string; minutes: number; sessions: number }>;
}

export function StatsDrawer({
  open,
  onClose,
  completedSessions,
  focusMinutes,
  breakMinutes,
  streak,
  weeklyFocus,
}: StatsDrawerProps) {
  const peakMinutes = Math.max(...weeklyFocus.map((item) => item.minutes), 1);

  const metrics = [
    { label: 'Completed focus blocks', value: completedSessions, icon: Target },
    { label: 'Focus minutes today', value: focusMinutes, icon: BarChart3 },
    { label: 'Break minutes today', value: breakMinutes, icon: Coffee },
    { label: 'Current streak', value: streak, icon: Flame },
  ];

  return (
    <Drawer open={open} title="Focus Stats" onClose={onClose}>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          {metrics.map(({ label, value, icon: Icon }) => (
            <article key={label} className="rounded-[28px] border border-white/70 bg-white/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">{label}</p>
                  <p className="mt-3 font-display text-4xl text-ink">{value}</p>
                </div>
                <span className="rounded-full bg-[#f2dfd5] p-3 text-blush">
                  <Icon size={18} />
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/70 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">Last seven days</p>
            <h3 className="mt-2 font-display text-3xl text-ink">Weekly rhythm</h3>
          </div>
          <div className="mt-8 grid grid-cols-7 gap-3">
            {weeklyFocus.map((entry) => (
              <div key={entry.dateLabel} className="flex flex-col items-center gap-3">
                <div className="flex h-44 w-full items-end">
                  <div
                    className="w-full rounded-t-[20px] bg-[linear-gradient(180deg,#c8745d,#294238)]"
                    style={{ height: `${Math.max(12, (entry.minutes / peakMinutes) * 100)}%` }}
                    title={`${entry.minutes} minutes`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">{entry.dateLabel}</p>
                  <p className="text-xs text-dusk/70">{entry.sessions} sessions</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Drawer>
  );
}
