import { BellRing, Pause, Volume2 } from 'lucide-react';

interface SessionEndAlertProps {
  open: boolean;
  phaseLabel: string;
  message: string;
  onSnooze: () => void;
  onStop: () => void;
}

export function SessionEndAlert({ open, phaseLabel, message, onSnooze, onStop }: SessionEndAlertProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/55 px-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-[36px] border border-white/70 bg-[#fff8f1] p-6 shadow-[0_32px_120px_rgba(32,24,20,0.34)] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="mt-1 rounded-full bg-[#f2dfd5] p-4 text-blush">
            <BellRing size={28} />
          </span>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.38em] text-dusk/70">Session finished</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">
              {phaseLabel} is over.
            </h2>
            <p className="mt-4 max-w-xl text-base text-dusk/85 sm:text-lg">{message}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-blush/20 bg-white px-5 py-4 text-sm text-dusk/80">
          <div className="flex items-center gap-2 font-medium text-ink">
            <Volume2 size={16} />
            Alarm is active until you snooze or stop it.
          </div>
          <p className="mt-2">If browser notifications are allowed, a persistent system notification is also shown.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 py-4 text-sm font-medium text-canvas transition hover:bg-pine"
            onClick={onStop}
          >
            <Pause size={16} />
            Stop alarm
          </button>
          <button
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-ink/10 bg-white px-5 py-4 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
            onClick={onSnooze}
          >
            Snooze 5 min
          </button>
        </div>
      </div>
    </div>
  );
}
