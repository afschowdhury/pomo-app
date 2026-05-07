import type { AudioPlaybackStatus, AudioSource } from '@/types/domain';

export const audioStatusLabels: Record<AudioPlaybackStatus, string> = {
  idle: 'Ready',
  playing_in_app: 'Playing in app',
  opened_externally: 'Opened externally',
  needs_user_gesture: 'Needs user gesture',
  unavailable_offline: 'Unavailable offline',
  error: 'Unavailable',
};

export function canPlayInline(source: AudioSource) {
  return source.kind === 'direct_stream' && Boolean(source.streamUrl);
}

export function canEmbedSource(source: AudioSource) {
  return source.kind === 'embed_frame' && Boolean(source.embedUrl);
}

export async function playNotificationCue(kind: 'focus' | 'break', volume = 0.2) {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
    return;
  }

  const audioContext = new AudioContext();
  const notes = kind === 'focus' ? [523.25, 659.25] : [392, 523.25, 659.25];
  let cursor = audioContext.currentTime;

  notes.forEach((frequency) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, cursor);
    gain.gain.exponentialRampToValueAtTime(volume, cursor + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, cursor + 0.28);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + 0.3);
    cursor += 0.14;
  });

  window.setTimeout(() => {
    void audioContext.close();
  }, 800);
}

export function notifyPhaseChange(title: string, body: string) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

function buildAlarmToneDataUrl() {
  const sampleRate = 44_100;
  const durationSeconds = 1.2;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const pcm = new Int16Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / sampleRate;
    const envelope = t < 0.08 ? t / 0.08 : Math.max(0, 1 - (t - 0.08) / 1.12);
    const harmonics =
      Math.sin(2 * Math.PI * 880 * t) * 0.42 +
      Math.sin(2 * Math.PI * 660 * t) * 0.25 +
      Math.sin(2 * Math.PI * 440 * t) * 0.15;
    pcm[index] = Math.max(-1, Math.min(1, harmonics * envelope)) * 0x7fff;
  }

  const byteLength = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, byteLength, true);

  pcm.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample, true);
  });

  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:audio/wav;base64,${btoa(binary)}`;
}

let cachedAlarmTone: string | null = null;

export function getAlarmToneDataUrl() {
  if (!cachedAlarmTone) {
    cachedAlarmTone = buildAlarmToneDataUrl();
  }

  return cachedAlarmTone;
}

export async function notifySessionFinished(title: string, body: string) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const options: NotificationOptions = {
    body,
    tag: 'pomodoro-session-finished',
    requireInteraction: true,
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Fall back to the page notification path.
  }

  new Notification(title, options);
}
