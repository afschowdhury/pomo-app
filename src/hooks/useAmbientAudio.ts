import { useCallback, useEffect, useMemo, useRef } from 'react';
import { canEmbedSource, canPlayInline } from '@/lib/audio';
import type { AudioSource } from '@/types/domain';
import { useAppStore } from '@/store/useAppStore';

function isM3u8(url: string) {
  return url.toLowerCase().includes('.m3u8');
}

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
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
    }

    audioRef.current.volume = settings.ambientMuted ? 0 : settings.ambientVolume;
  }, [settings.ambientMuted, settings.ambientVolume]);

  useEffect(() => cleanupInlineAudio, [cleanupInlineAudio]);

  const stopPlayback = useCallback(() => {
    cleanupInlineAudio();
    setAudioStatus('idle');
  }, [cleanupInlineAudio, setAudioStatus]);

  const activateSource = useCallback(
    async (source: AudioSource) => {
      await setSelectedAudioSourceId(source.id);

      if (typeof navigator !== 'undefined' && !navigator.onLine && source.kind !== 'notification_sound') {
        cleanupInlineAudio();
        setAudioStatus('unavailable_offline', 'This source needs a connection.');
        return;
      }

      if (canPlayInline(source) && source.streamUrl && audioRef.current) {
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
    [cleanupInlineAudio, setAudioStatus, setSelectedAudioSourceId],
  );

  const toggleMute = useCallback(async () => {
    await useAppStore.getState().updateSettings({
      ambientMuted: !useAppStore.getState().settings.ambientMuted,
    });
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    await useAppStore.getState().updateSettings({ ambientVolume: volume });
  }, []);

  return {
    currentSource,
    embedSource:
      currentSource && canEmbedSource(currentSource)
        ? currentSource
        : null,
    activateSource,
    stopPlayback,
    toggleMute,
    setVolume,
  };
}
