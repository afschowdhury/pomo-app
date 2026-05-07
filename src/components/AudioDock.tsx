import { ExternalLink, Heart, PauseCircle, PlayCircle, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Surface } from '@/components/Surface';
import { audioStatusLabels } from '@/lib/audio';
import type { AudioPlaybackStatus, AudioSource } from '@/types/domain';

interface AudioDockProps {
  sources: AudioSource[];
  selectedSourceId: string | null;
  audioStatus: AudioPlaybackStatus;
  audioError: string | null;
  volume: number;
  muted: boolean;
  embedSource: AudioSource | null;
  onActivateSource: (source: AudioSource) => void;
  onStop: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleMute: () => void;
  onSetVolume: (volume: number) => void;
  onAddCustom: (payload: { label: string; url: string; mode: AudioSource['kind'] }) => void;
  onRemoveSource: (id: string) => void;
}

export function AudioDock({
  sources,
  selectedSourceId,
  audioStatus,
  audioError,
  volume,
  muted,
  embedSource,
  onActivateSource,
  onStop,
  onToggleFavorite,
  onToggleMute,
  onSetVolume,
  onAddCustom,
  onRemoveSource,
}: AudioDockProps) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<AudioSource['kind']>('direct_stream');
  const ambientSources = useMemo(
    () => sources.filter((source) => source.kind !== 'notification_sound'),
    [sources],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!label.trim() || !url.trim()) {
      return;
    }

    onAddCustom({
      label: label.trim(),
      url: url.trim(),
      mode,
    });
    setLabel('');
    setUrl('');
    setMode('direct_stream');
  };

  return (
    <div className="space-y-4">
      <Surface className="border-white/60 bg-white/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">Ambient dock</p>
            <h2 className="mt-2 font-display text-3xl text-ink">Sound without timer lock-in</h2>
            <p className="mt-2 max-w-2xl text-sm text-dusk/80">
              Built-ins keep Chillhop and lofi.cafe available as companion tabs. Direct streams and embeds
              can also run inside the app when you add them.
            </p>
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-dusk">
            <p className="text-xs uppercase tracking-[0.28em] text-dusk/60">Source state</p>
            <p className="mt-1 font-medium text-ink">{audioStatusLabels[audioStatus]}</p>
            {audioError ? <p className="mt-1 text-xs text-blush">{audioError}</p> : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[24px] border border-ink/10 bg-[#fffaf3] p-4">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-canvas transition hover:bg-pine"
            onClick={onStop}
          >
            <PauseCircle size={16} />
            Stop playback
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-3 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
            onClick={onToggleMute}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <label className="flex min-w-[220px] flex-1 items-center gap-3 text-sm text-dusk">
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
      </Surface>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Surface className="border-white/60 bg-[rgba(255,255,255,0.68)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl text-ink">Built-in sources</h3>
            <span className="text-sm text-dusk/75">{ambientSources.length} available</span>
          </div>
          <div className="mt-4 grid gap-3">
            {ambientSources.map((source) => {
              const isSelected = selectedSourceId === source.id;

              return (
                <article
                  key={source.id}
                  className={`rounded-[24px] border p-4 transition ${
                    isSelected
                      ? 'border-blush/30 bg-[#fdf3ee]'
                      : 'border-ink/10 bg-[#fffaf3]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-ink">{source.label}</h4>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-dusk/70">
                          {source.provider.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-dusk/80">{source.description}</p>
                    </div>
                    <button
                      className="rounded-full border border-ink/10 bg-white p-2 text-dusk transition hover:border-blush/40 hover:text-blush"
                      onClick={() => onToggleFavorite(source.id)}
                      aria-label="Toggle favorite"
                    >
                      <Heart size={16} fill={source.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-canvas transition hover:bg-pine"
                      onClick={() => onActivateSource(source)}
                    >
                      <PlayCircle size={16} />
                      {source.kind === 'external_companion' ? 'Open companion' : 'Play source'}
                    </button>
                    {source.launchUrl ? (
                      <a
                        className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm text-dusk transition hover:border-blush/40 hover:text-blush"
                        href={source.launchUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={16} />
                        Open official page
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </Surface>

        <div className="space-y-4">
          <Surface className="border-white/60 bg-[rgba(255,255,255,0.68)] p-5">
            <h3 className="font-display text-2xl text-ink">Add a custom source</h3>
            <p className="mt-2 text-sm text-dusk/80">
              Use direct streams for inline playback, embed URLs for iframe players, or companion URLs for
              sites you prefer to open separately.
            </p>
            <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Rain archive"
                className="w-full rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-ink outline-none transition focus:border-blush/50"
              />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-ink outline-none transition focus:border-blush/50"
              />
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as AudioSource['kind'])}
                className="w-full rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-ink outline-none transition focus:border-blush/50"
              >
                <option value="direct_stream">Direct stream</option>
                <option value="embed_frame">Embed frame</option>
                <option value="external_companion">External companion</option>
              </select>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-canvas transition hover:bg-pine"
              >
                <PlayCircle size={16} />
                Save source
              </button>
            </form>
          </Surface>

          <Surface className="border-white/60 bg-[rgba(255,255,255,0.68)] p-5">
            <h3 className="font-display text-2xl text-ink">Your saved sources</h3>
            <div className="mt-4 space-y-3">
              {ambientSources.filter((source) => !source.builtIn).length === 0 ? (
                <p className="rounded-[24px] border border-dashed border-ink/10 bg-[#fffaf3] p-4 text-sm text-dusk/80">
                  Nothing custom yet. Add one when you want a reliable inline stream or embed.
                </p>
              ) : (
                ambientSources
                  .filter((source) => !source.builtIn)
                  .map((source) => (
                    <article
                      key={source.id}
                      className="rounded-[24px] border border-ink/10 bg-[#fffaf3] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-ink">{source.label}</p>
                          <p className="mt-1 text-sm text-dusk/75">{source.kind.replace('_', ' ')}</p>
                        </div>
                        <button
                          className="rounded-full border border-ink/10 bg-white p-2 text-dusk transition hover:border-blush/40 hover:text-blush"
                          onClick={() => onRemoveSource(source.id)}
                          aria-label="Remove source"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-4">
                        <button
                          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-canvas transition hover:bg-pine"
                          onClick={() => onActivateSource(source)}
                        >
                          <PlayCircle size={16} />
                          Activate
                        </button>
                      </div>
                    </article>
                  ))
              )}
            </div>
          </Surface>
        </div>
      </div>

      {embedSource?.embedUrl ? (
        <Surface className="border-white/60 bg-white/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">Embedded source</p>
              <h3 className="mt-2 font-display text-2xl text-ink">{embedSource.label}</h3>
            </div>
            <span className="rounded-full bg-[#f2dfd5] px-3 py-2 text-xs uppercase tracking-[0.2em] text-blush">
              {audioStatusLabels[audioStatus]}
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-[24px] border border-ink/10">
            <iframe
              src={embedSource.embedUrl}
              title={embedSource.label}
              className="min-h-[320px] w-full bg-white"
              allow="autoplay; encrypted-media"
            />
          </div>
        </Surface>
      ) : null}
    </div>
  );
}
