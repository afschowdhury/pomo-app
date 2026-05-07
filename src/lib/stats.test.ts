import { describe, expect, it } from 'vitest';
import { getCurrentStreak, getTodaySummary, getWeeklyFocus } from '@/lib/stats';
import type { SessionRecord } from '@/types/domain';

const baseDate = new Date('2026-04-06T12:00:00.000Z');

const sessions: SessionRecord[] = [
  {
    id: '1',
    phase: 'work',
    taskId: null,
    startedAt: new Date('2026-04-06T09:00:00.000Z').getTime(),
    endedAt: new Date('2026-04-06T09:25:00.000Z').getTime(),
    completed: true,
  },
  {
    id: '2',
    phase: 'work',
    taskId: null,
    startedAt: new Date('2026-04-05T09:00:00.000Z').getTime(),
    endedAt: new Date('2026-04-05T09:25:00.000Z').getTime(),
    completed: true,
  },
  {
    id: '3',
    phase: 'short_break',
    taskId: null,
    startedAt: new Date('2026-04-06T09:25:00.000Z').getTime(),
    endedAt: new Date('2026-04-06T09:30:00.000Z').getTime(),
    completed: true,
  },
];

describe('stats utils', () => {
  it('summarizes today focus and break minutes', () => {
    expect(getTodaySummary(sessions, 8, baseDate)).toEqual({
      completedSessions: 1,
      focusMinutes: 25,
      breakMinutes: 5,
      goalProgress: 12.5,
    });
  });

  it('calculates the current streak from completed work sessions', () => {
    expect(getCurrentStreak(sessions, baseDate)).toBe(2);
  });

  it('returns seven days of weekly focus data', () => {
    const weekly = getWeeklyFocus(sessions, baseDate);
    expect(weekly).toHaveLength(7);
    expect(weekly.at(-1)?.minutes).toBe(25);
  });
});
