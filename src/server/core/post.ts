import { reddit, context } from '@devvit/web/server';
import {
  getDailyPuzzle,
  getUtcDateString,
  getEpochDayIndex,
} from '../../shared/engine/index.ts';

type RedditPostClient = {
  submitCustomPost: (options: {
    title: string;
    entry?: string;
    subredditName?: string;
    postData?: Record<string, unknown>;
    textFallback?: { text: string };
  }) => Promise<{ id: string }>;
};

export type CreatePostOptions = {
  date?: string;
  subredditName?: string;
  client?: RedditPostClient;
};

export type CreatedPostResult = {
  id: string;
  title: string;
  subredditName: string;
  puzzleDate: string;
};

export const formatDailyPostTitle = (dateString: string): string => {
  const epochDay = getEpochDayIndex(dateString);
  return `Daily Paradox #${epochDay} — ${dateString}: Can you spot the broken button?`;
};

const getSafeSubredditName = (): string => {
  try {
    return context.subredditName ?? 'daily_paradox_dev';
  } catch {
    return 'daily_paradox_dev';
  }
};

export const createPost = async (
  options?: CreatePostOptions
): Promise<CreatedPostResult> => {
  const date = options?.date ?? getUtcDateString();
  const puzzle = getDailyPuzzle(date);
  const epochDay = getEpochDayIndex(date);
  const title = formatDailyPostTitle(date);
  const subredditName = options?.subredditName ?? getSafeSubredditName();
  const redditClient = options?.client ?? reddit;

  const post = await redditClient.submitCustomPost({
    title,
    entry: 'default',
    subredditName,
    postData: {
      puzzleId: puzzle.id,
      puzzleDate: puzzle.date,
      epochDay,
      startValue: puzzle.startValue,
      targetValue: puzzle.targetValue,
      parMoves: puzzle.parMoves,
    },
    textFallback: {
      text: `Daily Paradox #${epochDay} (${puzzle.date}): Can you spot the broken button? Transform ${puzzle.startValue} to ${puzzle.targetValue} in ${puzzle.parMoves} moves or fewer. Exactly one operation secretly behaves differently from its label! Play the interactive puzzle on Reddit.`,
    },
  });

  return {
    id: post.id,
    title,
    subredditName,
    puzzleDate: puzzle.date,
  };
};
