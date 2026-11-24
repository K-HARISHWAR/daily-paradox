import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  DailyPuzzleResponse,
} from '../../shared/api';
import {
  getDailyPuzzle,
  getUtcDateString,
  getMillisecondsUntilNextUtcReset,
  sanitizePuzzleForClient,
} from '../../shared/engine/index.ts';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/daily', (c) => {
  const dateQuery = c.req.query('date');
  const puzzleQuery = c.req.query('puzzle');

  const puzzle = getDailyPuzzle(dateQuery, puzzleQuery);
  const sanitized = sanitizePuzzleForClient(puzzle);
  const now = new Date();
  const serverUtcDate = getUtcDateString(now);
  const msUntilReset = getMillisecondsUntilNextUtcReset(now);
  const isOverride = Boolean(dateQuery || puzzleQuery);

  return c.json<DailyPuzzleResponse>({
    type: 'daily',
    puzzle: sanitized,
    serverUtcDate,
    msUntilReset,
    isOverride,
  });
});

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});
