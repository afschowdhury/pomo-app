import { Flame, Goal, TimerReset } from 'lucide-react';
import { Surface } from '@/components/Surface';

interface DailyStripProps {
  completedSessions: number;
  focusMinutes: number;
  streak: number;
  goal: number;
}

export function DailyStrip({ completedSessions, focusMinutes, streak, goal }: DailyStripProps) {
  const metrics = [
    {
      label: 'Today',
      value: `${completedSessions}/${goal}`,
      detail: 'completed sessions',
      icon: Goal,
    },
    {
      label: 'Focus',
      value: `${focusMinutes}m`,
      detail: 'deep work logged',
      icon: TimerReset,
    },
    {
      label: 'Streak',
      value: `${streak} day${streak === 1 ? '' : 's'}`,
      detail: 'consecutive focus days',
      icon: Flame,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map(({ label, value, detail, icon: Icon }) => (
        <Surface key={label} className="animate-appear border-white/60 bg-white/60 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">{label}</p>
              <h3 className="mt-2 font-display text-2xl text-ink">{value}</h3>
              <p className="mt-1 text-sm text-dusk/80">{detail}</p>
            </div>
            <span className="rounded-full bg-[#f2dfd5] p-3 text-blush">
              <Icon size={18} />
            </span>
          </div>
        </Surface>
      ))}
    </div>
  );
}
