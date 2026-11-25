import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  DailyPuzzleResponse,
  SubmitScoreRequest,
  CompletePuzzleResponse,
  ProgressResponse,
} from '../../shared/api.ts';
import {
  getDailyPuzzle,
  getUtcDateString,
  getMillisecondsUntilNextUtcReset,
  sanitizePuzzleForClient,
} from '../../shared/engine/index.ts';
import {
  createPlayerStorage,
  validateMoveSequence,
} from '../core/storage.ts';

type ErrorResponse = {
  status: 'error';
  message: string;
};

const getSafeContext = (): {
  subredditName?: string;
  postId?: string;
  userId?: string;
} => {
  try {
    return {
      subredditName: context.subredditName,
      postId: context.postId,
      userId: context.userId,
    };
  } catch {
    return {};
  }
};

const getSafeCurrentUsername = async (): Promise<string> => {
  try {
    const name = await reddit.getCurrentUsername();
    return name ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
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
  const safeCtx = getSafeContext();

  return c.json<DailyPuzzleResponse>({
    type: 'daily',
    puzzle: sanitized,
    serverUtcDate,
    msUntilReset,
    isOverride,
    subredditName: safeCtx.subredditName,
    postId: safeCtx.postId,
  });
});

api.get('/progress', async (c) => {
  const username = await getSafeCurrentUsername();
  const safeCtx = getSafeContext();
  const userId = safeCtx.userId ?? username;
  const todayUtc = getUtcDateString();

  try {
    const storage = createPlayerStorage(redis);
    const progress = await storage.getPlayerProgress(userId, username, todayUtc);

    return c.json<ProgressResponse>({
      type: 'progress',
      userId: progress.userId,
      username: progress.username,
      currentStreak: progress.currentStreak,
      maxStreak: progress.maxStreak,
      totalCompleted: progress.totalCompleted,
      lastCompletedDate: progress.lastCompletedDate,
      hasCompletedToday: progress.todayRecord !== null,
      subredditName: safeCtx.subredditName,
      postId: safeCtx.postId,
      todayRecord: progress.todayRecord
        ? {
            puzzleDate: progress.todayRecord.puzzleDate,
            movesTaken: progress.todayRecord.movesTaken,
            score: progress.todayRecord.score,
            hintsUsed: progress.todayRecord.hintsUsed,
          }
        : null,
    });
  } catch {
    return c.json<ProgressResponse>({
      type: 'progress',
      userId,
      username,
      currentStreak: 0,
      maxStreak: 0,
      totalCompleted: 0,
      lastCompletedDate: null,
      hasCompletedToday: false,
      subredditName: safeCtx.subredditName,
      postId: safeCtx.postId,
      todayRecord: null,
    });
  }
});

api.post('/complete', async (c) => {
  const body = await c.req.json<SubmitScoreRequest>();
  const username = await getSafeCurrentUsername();
  const safeCtx = getSafeContext();
  const userId = safeCtx.userId ?? username;

  if (!body.puzzleId || !body.puzzleDate || !Array.isArray(body.moveSequence)) {
    return c.json<CompletePuzzleResponse>(
      {
        type: 'complete',
        success: false,
        score: 0,
        currentStreak: 0,
        maxStreak: 0,
        totalCompleted: 0,
        isDuplicate: false,
        error: 'Invalid payload: puzzleId, puzzleDate, and moveSequence are required.',
      },
      400
    );
  }

  // 1. Fetch official authoritative puzzle definition
  const officialPuzzle = getDailyPuzzle(body.puzzleDate, body.puzzleId);

  // 2. Validate move sequence and calculate verified score server-side
  const validation = validateMoveSequence(
    officialPuzzle,
    body.moveSequence,
    body.unlockedHintTier ?? 0
  );

  if (!validation.isValid) {
    return c.json<CompletePuzzleResponse>(
      {
        type: 'complete',
        success: false,
        score: 0,
        currentStreak: 0,
        maxStreak: 0,
        totalCompleted: 0,
        isDuplicate: false,
        error: validation.error ?? 'Invalid puzzle solution.',
      },
      400
    );
  }

  // 3. Persist completion record and update streak in Devvit Redis
  try {
    const storage = createPlayerStorage(redis);
    const result = await storage.savePlayerCompletion(userId, username, {
      puzzleId: officialPuzzle.id,
      puzzleDate: body.puzzleDate,
      completed: true,
      movesTaken: validation.movesTaken,
      score: validation.score,
      hintsUsed: body.unlockedHintTier ?? 0,
      completedAt: new Date().toISOString(),
      moveSequence: body.moveSequence,
    });

    return c.json<CompletePuzzleResponse>({
      type: 'complete',
      success: true,
      score: validation.score,
      currentStreak: result.progress.currentStreak,
      maxStreak: result.progress.maxStreak,
      totalCompleted: result.progress.totalCompleted,
      isDuplicate: result.isDuplicate,
    });
  } catch {
    return c.json<CompletePuzzleResponse>({
      type: 'complete',
      success: true,
      score: validation.score,
      currentStreak: 1,
      maxStreak: 1,
      totalCompleted: 1,
      isDuplicate: false,
    });
  }
});

api.get('/init', async (c) => {
  const safeCtx = getSafeContext();
  const postId = safeCtx.postId;

  if (!postId) {
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
  const safeCtx = getSafeContext();
  const postId = safeCtx.postId;
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
  const safeCtx = getSafeContext();
  const postId = safeCtx.postId;
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
