export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  movesTaken: number;
  hintsUsed: number;
  completedAt: string;
};

export const compareLeaderboardEntries = (
  a: LeaderboardEntry,
  b: LeaderboardEntry
): number => {
  // 1. Higher score first
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  // 2. Fewer moves taken first
  if (a.movesTaken !== b.movesTaken) {
    return a.movesTaken - b.movesTaken;
  }
  // 3. Fewer hints used first
  if (a.hintsUsed !== b.hintsUsed) {
    return a.hintsUsed - b.hintsUsed;
  }
  // 4. Earlier completion time first
  const timeA = new Date(a.completedAt).getTime();
  const timeB = new Date(b.completedAt).getTime();
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  // 5. Stable alphabetical tie-breaker
  return a.username.localeCompare(b.username);
};

export const sortLeaderboard = (
  entries: LeaderboardEntry[],
  limit = 50
): LeaderboardEntry[] => {
  return [...entries].sort(compareLeaderboardEntries).slice(0, limit);
};

export const calculateUserRank = (
  entries: LeaderboardEntry[],
  userId: string
): number | null => {
  const index = entries.findIndex((e) => e.userId === userId);
  return index >= 0 ? index + 1 : null;
};
