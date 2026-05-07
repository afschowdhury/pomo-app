import Dexie, { type Table } from 'dexie';
import type { AudioSource, PomodoroSettings, SessionRecord, TaskItem, TimerState } from '@/types/domain';

export const SETTINGS_KEY = 'settings';
export const TIMER_KEY = 'timer';

export interface SettingsEntity {
  id: typeof SETTINGS_KEY;
  value: PomodoroSettings;
}

export interface TimerEntity {
  id: typeof TIMER_KEY;
  value: TimerState;
}

class PomodoroDatabase extends Dexie {
  settings!: Table<SettingsEntity, string>;
  timer!: Table<TimerEntity, string>;
  tasks!: Table<TaskItem, string>;
  sessions!: Table<SessionRecord, string>;
  audioSources!: Table<AudioSource, string>;

  constructor() {
    super('still-pomodoro');

    this.version(1).stores({
      settings: '&id',
      timer: '&id',
      tasks: 'id, status, order, updatedAt',
      sessions: 'id, endedAt, phase, completed, taskId',
      audioSources: 'id, provider, kind, isFavorite',
    });
  }
}

export const db = new PomodoroDatabase();
