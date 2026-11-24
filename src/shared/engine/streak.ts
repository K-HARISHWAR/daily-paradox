import { getEpochDayIndex } from './daily.ts';

export type StreakUpdateResult = {
  currentStreak: number;
  maxStreak: number;
  lastCompletedDate: string;
  isDuplicate: boolean;
};

export const calculateUpdatedStreak = (
  lastCompletedDate: string | null,
  currentStreak: number,
  maxStreak: number,
  todayUtcDate: string
): StreakUpdateResult => {
  // 1. If already completed today, it's a duplicate completion
  if (lastCompletedDate === todayUtcDate) {
    return {
      currentStreak,
      maxStreak,
      lastCompletedDate: todayUtcDate,
      isDuplicate: true,
    };
  }

  // 2. First-time player
  if (!lastCompletedDate) {
    return {
      currentStreak: 1,
      maxStreak: Math.max(1, maxStreak),
      lastCompletedDate: todayUtcDate,
      isDuplicate: false,
    };
  }

  // 3. Compare epoch days
  const lastDayIndex = getEpochDayIndex(lastCompletedDate);
  const todayDayIndex = getEpochDayIndex(todayUtcDate);
  const diffDays = todayDayIndex - lastDayIndex;

  if (diffDays === 1) {
    // Played yesterday -> streak continues!
    const updatedStreak = currentStreak + 1;
    return {
      currentStreak: updatedStreak,
      maxStreak: Math.max(maxStreak, updatedStreak),
      lastCompletedDate: todayUtcDate,
      isDuplicate: false,
    };
  }

  if (diffDays <= 0) {
    // Replay of an older date or clock skew -> treat as duplicate/non-streak advancing
    return {
      currentStreak,
      maxStreak,
      lastCompletedDate,
      isDuplicate: true,
    };
  }

  // Missed one or more days -> streak resets to 1
  return {
    currentStreak: 1,
    maxStreak: Math.max(maxStreak, 1),
    lastCompletedDate: todayUtcDate,
    isDuplicate: false,
  };
};
