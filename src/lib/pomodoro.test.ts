import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@/lib/defaults';
import {
  buildTimerForPhase,
  createSessionRecord,
  getNextPhase,
  getTransitionTarget,
  resolveRemainingMs,
} from '@/lib/pomodoro';

describe('pomodoro utils', () => {
  it('resolves remaining time from endsAt when running', () => {
    const timer = {
      ...buildTimerForPhase('work', defaultSettings),
      isRunning: true,
      endsAt: 10_000,
      remainingMs: 25_000,
      startedAt: 0,
    };

    expect(resolveRemainingMs(timer, 8_500)).toBe(1_500);
  });

  it('moves to a long break after the configured cadence', () => {
    const timer = {
      ...buildTimerForPhase('work', defaultSettings),
      cycleIndex: 3,
    };

    expect(getNextPhase(timer, defaultSettings, true)).toEqual({
      nextPhase: 'long_break',
      nextCycleIndex: 4,
    });
  });

  it('keeps cycle count unchanged when a work phase is skipped', () => {
    const timer = {
      ...buildTimerForPhase('work', defaultSettings),
      cycleIndex: 2,
    };

    expect(getNextPhase(timer, defaultSettings, false)).toEqual({
      nextPhase: 'short_break',
      nextCycleIndex: 2,
    });
  });

  it('builds a completed session record using the phase start time', () => {
    const timer = {
      ...buildTimerForPhase('work', defaultSettings),
      startedAt: 1_000,
      endsAt: 101_000,
      isRunning: true,
      remainingMs: 0,
      activeTaskId: 'task-1',
    };

    const session = createSessionRecord(timer, defaultSettings, 101_000, true);
    expect(session.taskId).toBe('task-1');
    expect(session.startedAt).toBe(1_000);
    expect(session.completed).toBe(true);
  });

  it('auto-starts breaks when that setting is enabled', () => {
    const timer = {
      ...buildTimerForPhase('work', defaultSettings),
      cycleIndex: 0,
    };

    const result = getTransitionTarget(timer, defaultSettings, 50_000, true);
    expect(result.nextTimer.phase).toBe('short_break');
    expect(result.nextTimer.isRunning).toBe(true);
  });
});
