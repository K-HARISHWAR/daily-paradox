import type { SanitizedPuzzle } from './engine/types.ts';

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
};
