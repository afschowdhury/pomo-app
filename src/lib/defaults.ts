import type { AudioSource, PomodoroSettings, TimerState } from '@/types/domain';
import { buildTimerForPhase } from '@/lib/pomodoro';

export const defaultSettings: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  dailyGoalSessions: 8,
  soundEnabled: true,
  notificationPermission:
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  defaultAudioSourceId: 'focus-chime',
  ambientVolume: 0.45,
  ambientMuted: false,
};

export function createDefaultTimerState(settings: PomodoroSettings): TimerState {
  return buildTimerForPhase('work', settings);
}

export const builtInAudioSources: AudioSource[] = [
  {
    id: 'focus-chime',
    label: 'Focus chime',
    provider: 'system',
    kind: 'notification_sound',
    launchUrl: null,
    streamUrl: null,
    embedUrl: null,
    stationKey: 'focus',
    capabilities: {
      canPlayInline: false,
      canEmbed: false,
      canLaunch: false,
    },
    isFavorite: false,
    builtIn: true,
    description: 'Generated locally when a new focus block begins.',
  },
  {
    id: 'break-chime',
    label: 'Break chime',
    provider: 'system',
    kind: 'notification_sound',
    launchUrl: null,
    streamUrl: null,
    embedUrl: null,
    stationKey: 'break',
    capabilities: {
      canPlayInline: false,
      canEmbed: false,
      canLaunch: false,
    },
    isFavorite: false,
    builtIn: true,
    description: 'Generated locally when it is time to step away.',
  },
];
