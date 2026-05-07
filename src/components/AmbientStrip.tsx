import { PauseCircle, PlayCircle, Volume2, VolumeX } from 'lucide-react';
import { audioStatusLabels } from '@/lib/audio';
import { cn } from '@/lib/utils';
import type { AudioPlaybackStatus, AudioSource } from '@/types/domain';

interface AmbientStripProps {
  sources: AudioSource[];
  currentSource: AudioSource | null;
  audioStatus: AudioPlaybackStatus;
  volume: number;
  muted: boolean;
  onActivateSource: (source: AudioSource) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSetVolume: (volume: number) => void;
}

export function AmbientStrip({
  sources,
  currentSource,
  audioStatus,
  volume,
  muted,
  onActivateSource,
  onTogglePlay,
  onToggleMute,
  onSetVolume,
}: AmbientStripProps) {
  return (
    <section className="mt-6 rounded-[24px] border border-ink/10 bg-[#fffaf3] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.28em] text-dusk/70">Ambient focus sounds</p>
        <span className="rounded-full bg-[#f2dfd5] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blush">
          {audioStatusLabels[audioStatus]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {sources.map((source) => {
          const selected = currentSource?.id === source.id;
          return (
            <button
              key={source.id}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition',
                selected ? 'border-transparent bg-ink text-canvas' : 'border-ink/10 bg-white text-dusk hover:text-blush',
              )}
              onClick={() => onActivateSource(source)}
            >
              {source.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-canvas transition hover:bg-pine"
          onClick={onTogglePlay}
          disabled={!currentSource}
        >
          {audioStatus === 'playing_in_app' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
          {audioStatus === 'playing_in_app' ? 'Pause' : 'Play'}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
          onClick={onToggleMute}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <label className="flex min-w-[180px] flex-1 items-center gap-2 text-sm text-dusk">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => onSetVolume(Number(event.target.value))}
            className="h-2 w-full accent-blush"
          />
        </label>
      </div>
    </section>
  );
}
