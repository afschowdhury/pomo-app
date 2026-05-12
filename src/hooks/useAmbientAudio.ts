import { useCallback, useEffect, useMemo, useRef } from 'react';
import { canEmbedSource, canPlayInline } from '@/lib/audio';
import type { AudioSource } from '@/types/domain';
import { useAppStore } from '@/store/useAppStore';

function isM3u8(url: string) {
  return url.toLowerCase().includes('.m3u8');
}

function isRemoteStream(url: string) {
  return /^https?:\/\//i.test(url);
}

function isLocalAmbientStream(url: string) {
  return url.startsWith('/ambient/');
}

function resolveLoopBounds(buffer: AudioBuffer) {
  const channel = buffer.getChannelData(0);
  const threshold = 0.0012;
  let first = 0;
  let last = channel.length - 1;

  while (first < channel.length && Math.abs(channel[first]) < threshold) {
    first += 1;
  }
  while (last > first && Math.abs(channel[last]) < threshold) {
    last -= 1;
  }

  const sampleRate = buffer.sampleRate;
  const loopStart = Math.max(0, first / sampleRate);
  const loopEnd = Math.max(loopStart + 0.05, (last + 1) / sampleRate);
  return { loopStart, loopEnd };
}

const CROSSFADE_SEC = 0.06;
const FILL_INTERVAL_MS = 1500;
const SCHEDULE_HORIZON_SEC = 22;

type ScheduledChunk = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  endAt: number;
};

export function useAmbientAudio() {
  const audioSources = useAppStore((state) => state.audioSources);
  const selectedAudioSourceId = useAppStore((state) => state.selectedAudioSourceId);
  const settings = useAppStore((state) => state.settings);
  const setSelectedAudioSourceId = useAppStore((state) => state.setSelectedAudioSourceId);
  const setAudioStatus = useAppStore((state) => state.setAudioStatus);
  const currentSource = useMemo(
    () => audioSources.find((source) => source.id === selectedAudioSourceId) ?? null,
    [audioSources, selectedAudioSourceId],
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const localBufferCacheRef = useRef(new Map<string, { buffer: AudioBuffer; loopStart: number; loopEnd: number }>());
  const duckedRef = useRef(false);
  const ambientFillIntervalRef = useRef<number | null>(null);
  const ambientScheduledRef = useRef<ScheduledChunk[]>([]);
  const ambientLoopStateRef = useRef<{
    trimStart: number;
    chunkDuration: number;
    buffer: AudioBuffer;
    nextChunkAt: number;
  } | null>(null);

  const clearAmbientFillInterval = useCallback(() => {
    if (ambientFillIntervalRef.current !== null) {
      window.clearInterval(ambientFillIntervalRef.current);
      ambientFillIntervalRef.current = null;
    }
  }, []);

  const stopAllScheduledChunks = useCallback(() => {
    clearAmbientFillInterval();
    ambientLoopStateRef.current = null;
    for (const { source, gain } of ambientScheduledRef.current) {
      try {
        source.stop(0);
      } catch {
        // Already stopped
      }
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        // Ignore
      }
    }
    ambientScheduledRef.current = [];
  }, [clearAmbientFillInterval]);

  const applyVolume = useCallback(
    (audio: HTMLAudioElement) => {
      const duckMultiplier = duckedRef.current ? 0.2 : 1;
      const volume = settings.ambientMuted ? 0 : settings.ambientVolume * duckMultiplier;
      audio.volume = volume;
      const master = gainNodeRef.current;
      const ctx = audioContextRef.current;
      if (master && ctx && ctx.state !== 'closed') {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(volume, now);
      } else if (master) {
        master.gain.value = volume;
      }
    },
    [settings.ambientMuted, settings.ambientVolume],
  );

  const pruneFinishedChunks = useCallback((ctx: AudioContext) => {
    const now = ctx.currentTime;
    ambientScheduledRef.current = ambientScheduledRef.current.filter((chunk) => {
      if (chunk.endAt < now - 0.5) {
        try {
          chunk.source.disconnect();
          chunk.gain.disconnect();
        } catch {
          // Ignore
        }
        return false;
      }
      return true;
    });
  }, []);

  const scheduleCrossfadeChunks = useCallback(
    (ctx: AudioContext, masterGain: GainNode) => {
      const meta = ambientLoopStateRef.current;
      if (!meta || ctx.state === 'closed') {
        return;
      }

      pruneFinishedChunks(ctx);

      const { buffer, trimStart, chunkDuration: D } = meta;
      const C = CROSSFADE_SEC;
      const horizon = ctx.currentTime + SCHEDULE_HORIZON_SEC;

      while (meta.nextChunkAt < horizon) {
        const startTime = meta.nextChunkAt;
        const endTime = startTime + D;

        const source = ctx.createBufferSource();
        const chunkGain = ctx.createGain();
        source.buffer = buffer;
        source.connect(chunkGain);
        chunkGain.connect(masterGain);

        chunkGain.gain.setValueAtTime(0, startTime);
        chunkGain.gain.linearRampToValueAtTime(1, startTime + C);
        chunkGain.gain.setValueAtTime(1, endTime - C);
        chunkGain.gain.linearRampToValueAtTime(0, endTime);

        try {
          source.start(startTime, trimStart, D);
          source.stop(endTime);
        } catch {
          source.disconnect();
          chunkGain.disconnect();
          break;
        }

        ambientScheduledRef.current.push({ source, gain: chunkGain, endAt: endTime });
        meta.nextChunkAt += D - C;
      }
    },
    [pruneFinishedChunks],
  );

  const cleanupInlineAudio = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }

    stopAllScheduledChunks();

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
  }, [stopAllScheduledChunks]);

  const playLocalGaplessLoop = useCallback(
    async (url: string) => {
      cleanupInlineAudio();
      if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
        throw new Error('AudioContext unavailable');
      }

      const audioContext = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = audioContext;

      let entry = localBufferCacheRef.current.get(url);
      if (!entry) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        const { loopStart, loopEnd } = resolveLoopBounds(decoded);
        entry = { buffer: decoded, loopStart, loopEnd };
        localBufferCacheRef.current.set(url, entry);
      }

      const trimStart = entry.loopStart;
      const chunkDuration = Math.max(0.2, entry.loopEnd - entry.loopStart);

      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      gainNodeRef.current = masterGain;

      const startAt = audioContext.currentTime + 0.05;
      ambientLoopStateRef.current = {
        buffer: entry.buffer,
        trimStart,
        chunkDuration,
        nextChunkAt: startAt,
      };

      if (audioContext.state !== 'running') {
        await audioContext.resume();
      }

      if (audioRef.current) {
        applyVolume(audioRef.current);
      }

      scheduleCrossfadeChunks(audioContext, masterGain);

      ambientFillIntervalRef.current = window.setInterval(() => {
        const ctx = audioContextRef.current;
        const gain = gainNodeRef.current;
        if (!ctx || !gain || ctx.state === 'closed') {
          return;
        }
        scheduleCrossfadeChunks(ctx, gain);
      }, FILL_INTERVAL_MS);
    },
    [applyVolume, cleanupInlineAudio, scheduleCrossfadeChunks],
  );

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
      audioRef.current.loop = true;
    }

    applyVolume(audioRef.current);
  }, [applyVolume]);

  useEffect(() => cleanupInlineAudio, [cleanupInlineAudio]);

  const stopPlayback = useCallback(() => {
    cleanupInlineAudio();
    setAudioStatus('idle');
  }, [cleanupInlineAudio, setAudioStatus]);

  const activateSource = useCallback(
    async (source: AudioSource) => {
      await setSelectedAudioSourceId(source.id);

      if (
        typeof navigator !== 'undefined' &&
        !navigator.onLine &&
        source.kind === 'direct_stream' &&
        source.streamUrl !== null &&
        isRemoteStream(source.streamUrl)
      ) {
        cleanupInlineAudio();
        setAudioStatus('unavailable_offline', 'This source needs a connection.');
        return;
      }

      if (canPlayInline(source) && source.streamUrl && audioRef.current) {
        if (isLocalAmbientStream(source.streamUrl)) {
          try {
            await playLocalGaplessLoop(source.streamUrl);
            setAudioStatus('playing_in_app');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'The stream could not be played.';
            setAudioStatus('error', message);
          }
          return;
        }

        cleanupInlineAudio();
        const audio = audioRef.current;

        if (isM3u8(source.streamUrl)) {
          const { default: Hls } = await import('hls.js');

          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(source.streamUrl);
            hls.attachMedia(audio);
            hlsRef.current = hls;
          } else {
            audio.src = source.streamUrl;
          }
        } else {
          audio.src = source.streamUrl;
        }

        try {
          await audio.play();
          setAudioStatus('playing_in_app');
        } catch (error) {
          const domError = error as DOMException;
          setAudioStatus(
            domError?.name === 'NotAllowedError' ? 'needs_user_gesture' : 'error',
            domError?.message ?? 'The stream could not be played.',
          );
        }
        return;
      }

      if (canEmbedSource(source)) {
        cleanupInlineAudio();
        setAudioStatus('playing_in_app');
        return;
      }

      if (source.launchUrl) {
        cleanupInlineAudio();
        window.open(source.launchUrl, '_blank', 'noopener,noreferrer');
        setAudioStatus('opened_externally');
        return;
      }

      setAudioStatus('error', 'This source is not playable.');
    },
    [cleanupInlineAudio, playLocalGaplessLoop, setAudioStatus, setSelectedAudioSourceId],
  );

  const toggleMute = useCallback(async () => {
    await useAppStore.getState().updateSettings({
      ambientMuted: !useAppStore.getState().settings.ambientMuted,
    });
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    await useAppStore.getState().updateSettings({ ambientVolume: volume });
  }, []);

  const setDucked = useCallback(
    (ducked: boolean) => {
      duckedRef.current = ducked;
      if (audioRef.current) {
        applyVolume(audioRef.current);
      }
    },
    [applyVolume],
  );

  const togglePlay = useCallback(async () => {
    const selectedSource = currentSource;
    const state = useAppStore.getState();
    if (state.audioStatus === 'playing_in_app' && selectedSource) {
      stopPlayback();
      return;
    }
    if (selectedSource) {
      await activateSource(selectedSource);
    }
  }, [activateSource, currentSource, stopPlayback]);

  return {
    currentSource,
    embedSource:
      currentSource && canEmbedSource(currentSource)
        ? currentSource
        : null,
    activateSource,
    togglePlay,
    setDucked,
    stopPlayback,
    toggleMute,
    setVolume,
  };
}
