import type { SanitizedPuzzle } from './engine/types.ts';
import type { LeaderboardEntry } from './engine/leaderboard.ts';

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type DailyPuzzleResponse = {
  type: 'daily';
  puzzle: SanitizedPuzzle;
  serverUtcDate: string;
  msUntilReset: number;
  isOverride: boolean;
  subredditName?: string;
  postId?: string;
};

export type SubmitScoreRequest = {
  puzzleId: string;
  puzzleDate: string;
  moveSequence: string[];
  unlockedHintTier: 0 | 1 | 2 | 3;
};

export type CompletePuzzleResponse = {
  type: 'complete';
  success: boolean;
  score: number;
  currentStreak: number;
  maxStreak: number;
  totalCompleted: number;
  isDuplicate: boolean;
  error?: string;
};

export type ProgressResponse = {
  type: 'progress';
  userId: string;
  username: string;
  currentStreak: number;
  maxStreak: number;
  totalCompleted: number;
  lastCompletedDate: string | null;
  hasCompletedToday: boolean;
  subredditName?: string;
  postId?: string;
  todayRecord: {
    puzzleDate: string;
    movesTaken: number;
    score: number;
    hintsUsed: number;
  } | null;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  puzzleDate: string;
  entries: LeaderboardEntry[];
  totalPlayers: number;
  userRank: number | null;
};
