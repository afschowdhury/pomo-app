import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { AmbientStrip } from '@/components/AmbientStrip';
import { Surface } from '@/components/Surface';
import { cn } from '@/lib/utils';
import { formatDuration, phaseLabels } from '@/lib/pomodoro';
import type { AudioPlaybackStatus, AudioSource, PomodoroPhase, TimerState } from '@/types/domain';

interface TimerCardProps {
  timer: TimerState;
  progress: number;
  currentTaskTitle: string | null;
  phaseDurationLabel: string;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onPhaseSelect: (phase: PomodoroPhase) => void;
  ambient: {
    sources: AudioSource[];
    currentSource: AudioSource | null;
    audioStatus: AudioPlaybackStatus;
    volume: number;
    muted: boolean;
    onActivateSource: (source: AudioSource) => void;
    onTogglePlay: () => void;
    onToggleMute: () => void;
    onSetVolume: (volume: number) => void;
  };
}

export function TimerCard({
  timer,
  progress,
  currentTaskTitle,
  phaseDurationLabel,
  onStart,
  onPause,
  onReset,
  onSkip,
  onPhaseSelect,
  ambient,
}: TimerCardProps) {
  const phases: PomodoroPhase[] = ['work', 'short_break', 'long_break'];

  return (
    <Surface className="relative overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,241,231,0.92))] p-6 md:p-8">
      <div className="absolute right-[-40px] top-[-20px] h-48 w-48 rounded-full bg-[#f0ddd2]/70 blur-3xl" />
      <div className="absolute bottom-[-50px] left-[-30px] h-40 w-40 rounded-full bg-[#dce7df]/70 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          {phases.map((phase) => (
            <button
              key={phase}
              className={cn(
                'rounded-full border px-4 py-2 text-sm transition',
                timer.phase === phase
                  ? 'border-transparent bg-ink text-canvas shadow-glow'
                  : 'border-ink/10 bg-white/70 text-dusk hover:border-blush/40 hover:text-blush',
              )}
              onClick={() => onPhaseSelect(phase)}
            >
              {phaseLabels[phase]}
            </button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-dusk/70">Current block</p>
          <h1 className="mt-3 font-display text-6xl text-ink sm:text-7xl md:text-8xl">
            {formatDuration(timer.remainingMs)}
          </h1>
          <p className="mt-4 text-base text-dusk/85">
            {currentTaskTitle ?? 'No active task selected'}
          </p>
          <p className="mt-2 text-sm text-dusk/70">{phaseDurationLabel}</p>
        </div>

        <div className="mt-8">
          <div className="h-2 rounded-full bg-ink/6">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#294238,#c8745d)] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-dusk/60">
            <span>{Math.round(progress)}% complete</span>
            <span>Cycle {timer.cycleIndex + 1}</span>
          </div>
        </div>

        <AmbientStrip
          sources={ambient.sources}
          currentSource={ambient.currentSource}
          audioStatus={ambient.audioStatus}
          volume={ambient.volume}
          muted={ambient.muted}
          onActivateSource={ambient.onActivateSource}
          onTogglePlay={ambient.onTogglePlay}
          onToggleMute={ambient.onToggleMute}
          onSetVolume={ambient.onSetVolume}
        />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            className="inline-flex min-w-40 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:bg-pine"
            onClick={timer.isRunning ? onPause : onStart}
          >
            {timer.isRunning ? <Pause size={18} /> : <Play size={18} />}
            {timer.isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-5 py-3 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
            onClick={onSkip}
          >
            <SkipForward size={16} />
            Skip
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-5 py-3 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
            onClick={onReset}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>
    </Surface>
  );
}
