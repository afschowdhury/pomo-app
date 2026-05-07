export type PomodoroPhase = 'work' | 'short_break' | 'long_break';
export type TaskStatus = 'queued' | 'active' | 'completed';
export type AudioSourceKind =
  | 'direct_stream'
  | 'embed_frame'
  | 'external_companion'
  | 'notification_sound';
export type AudioPlaybackStatus =
  | 'idle'
  | 'playing_in_app'
  | 'opened_externally'
  | 'needs_user_gesture'
  | 'unavailable_offline'
  | 'error';

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  dailyGoalSessions: number;
  soundEnabled: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  defaultAudioSourceId: string | null;
  ambientVolume: number;
  ambientMuted: boolean;
}

export interface TimerState {
  phase: PomodoroPhase;
  startedAt: number | null;
  endsAt: number | null;
  remainingMs: number;
  isRunning: boolean;
  cycleIndex: number;
  activeTaskId: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  estimatePomodoros: number;
  completedPomodoros: number;
  subtasks: TaskSubtask[];
  status: TaskStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRecord {
  id: string;
  phase: PomodoroPhase;
  taskId: string | null;
  startedAt: number;
  endedAt: number;
  completed: boolean;
  interruptionReason?: 'skipped' | 'reset' | 'manual-stop';
}

export interface AudioSourceCapabilities {
  canPlayInline: boolean;
  canEmbed: boolean;
  canLaunch: boolean;
}

export interface AudioSource {
  id: string;
  label: string;
  provider: 'custom' | 'system';
  kind: AudioSourceKind;
  launchUrl: string | null;
  streamUrl: string | null;
  embedUrl: string | null;
  stationKey: string | null;
  capabilities: AudioSourceCapabilities;
  isFavorite: boolean;
  builtIn: boolean;
  description: string;
}
