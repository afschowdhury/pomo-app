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
    <div className="fixed inset-0 z-[80] flex min-h-screen flex-col items-center justify-center bg-ink/70 px-4 py-8 backdrop-blur-md">
      <div className="flex w-full max-w-4xl flex-1 flex-col justify-center sm:max-w-5xl">
        <div className="w-full rounded-[36px] border border-white/70 bg-[#fff8f1] p-8 shadow-[0_32px_120px_rgba(32,24,20,0.34)] sm:p-12 lg:p-14">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:gap-8">
            <span className="rounded-full bg-[#f2dfd5] p-5 text-blush sm:p-6">
              <BellRing className="h-10 w-10 sm:h-12 sm:w-12" />
            </span>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.38em] text-dusk/70">Session finished</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-6xl lg:text-7xl">
                {phaseLabel} is over.
              </h2>
              <p className="mt-6 max-w-2xl text-lg text-dusk/85 sm:text-xl lg:text-2xl">{message}</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-blush/20 bg-white px-6 py-5 text-base text-dusk/80 sm:text-lg">
            <div className="flex items-center gap-2 font-medium text-ink">
              <Volume2 className="h-5 w-5 shrink-0" />
              Alarm is active until you snooze or stop it.
            </div>
            <p className="mt-3">
              If system notifications are allowed, a persistent macOS notification is also shown.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-5">
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 py-5 text-base font-medium text-canvas transition hover:bg-pine sm:text-lg"
              onClick={onStop}
            >
              <Pause className="h-5 w-5" />
              Stop alarm
            </button>
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-ink/10 bg-white px-6 py-5 text-base text-dusk transition hover:border-blush/40 hover:text-blush sm:text-lg"
              onClick={onSnooze}
            >
              Snooze 5 min
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
