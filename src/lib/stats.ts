import { eachDayOfInterval, endOfDay, format, isSameDay, startOfDay, subDays } from 'date-fns';
import type { SessionRecord } from '@/types/domain';

function sessionDurationMinutes(session: SessionRecord) {
  return Math.max(1, Math.round((session.endedAt - session.startedAt) / 60_000));
}

export function getCompletedWorkSessions(sessions: SessionRecord[]) {
  return sessions.filter((session) => session.phase === 'work' && session.completed);
}

export function getTodaySummary(sessions: SessionRecord[], dailyGoalSessions: number, now = new Date()) {
  const completedWork = getCompletedWorkSessions(sessions).filter((session) =>
    isSameDay(session.endedAt, now),
  );
  const completedBreaks = sessions.filter(
    (session) => session.phase !== 'work' && session.completed && isSameDay(session.endedAt, now),
  );

  const focusMinutes = completedWork.reduce((total, session) => total + sessionDurationMinutes(session), 0);
  const breakMinutes = completedBreaks.reduce(
    (total, session) => total + sessionDurationMinutes(session),
    0,
  );

  return {
    completedSessions: completedWork.length,
    focusMinutes,
    breakMinutes,
    goalProgress: dailyGoalSessions === 0 ? 0 : Math.min(100, (completedWork.length / dailyGoalSessions) * 100),
  };
}

export function getCurrentStreak(sessions: SessionRecord[], now = new Date()) {
  const completedByDay = new Set(
    getCompletedWorkSessions(sessions).map((session) => startOfDay(session.endedAt).getTime()),
  );

  let streak = 0;
  let cursor = startOfDay(now);

  while (completedByDay.has(cursor.getTime())) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

export function getWeeklyFocus(sessions: SessionRecord[], now = new Date()) {
  const range = eachDayOfInterval({
    start: startOfDay(subDays(now, 6)),
    end: endOfDay(now),
  });

  return range.map((day) => {
    const daySessions = getCompletedWorkSessions(sessions).filter((session) =>
      isSameDay(session.endedAt, day),
    );
    const minutes = daySessions.reduce((total, session) => total + sessionDurationMinutes(session), 0);

    return {
      dateLabel: format(day, 'EEE'),
      minutes,
      sessions: daySessions.length,
    };
  });
}
