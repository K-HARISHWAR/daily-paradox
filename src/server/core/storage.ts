import type {
  PlayerDailyRecord,
  PlayerProgress,
  Puzzle,
} from '../../shared/engine/types.ts';
import { applyOperation, applyStandard } from '../../shared/engine/operations.ts';
import { calculateScore } from '../../shared/engine/scoring.ts';
import { calculateUpdatedStreak } from '../../shared/engine/streak.ts';

export type StorageClient = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<unknown>;
};

export type ValidationOutcome = {
  isValid: boolean;
  score: number;
  movesTaken: number;
  paradoxDeduced: boolean;
  error?: string;
};

const isRecord = (val: unknown): val is Record<string, unknown> => {
  return typeof val === 'object' && val !== null;
};

export const validateMoveSequence = (
  puzzle: Puzzle,
  moveSequence: string[],
  unlockedHintTier: 0 | 1 | 2 | 3
): ValidationOutcome => {
  if (!Array.isArray(moveSequence) || moveSequence.length === 0) {
    return {
      isValid: false,
      score: 0,
      movesTaken: 0,
      paradoxDeduced: false,
      error: 'Move sequence cannot be empty.',
    };
  }

  if (moveSequence.length > puzzle.moveLimit) {
    return {
      isValid: false,
      score: 0,
      movesTaken: moveSequence.length,
      paradoxDeduced: false,
      error: `Move sequence length (${moveSequence.length}) exceeds move limit (${puzzle.moveLimit}).`,
    };
  }

  let currentValue = puzzle.startValue;
  let paradoxDeduced = false;

  for (let i = 0; i < moveSequence.length; i += 1) {
    const opId = moveSequence[i];
    const op = puzzle.operations.find((candidate) => candidate.id === opId);
    if (!op) {
      return {
        isValid: false,
        score: 0,
        movesTaken: i + 1,
        paradoxDeduced: false,
        error: `Unknown operation ID '${opId}' in sequence.`,
      };
    }

    const beforeVal = currentValue;
    const nextVal = applyOperation(beforeVal, op);
    if (nextVal === null) {
      return {
        isValid: false,
        score: 0,
        movesTaken: i + 1,
        paradoxDeduced: false,
        error: `Operation '${op.label}' could not be applied to value ${beforeVal}.`,
      };
    }

    const nominal = applyStandard(beforeVal, op.type, op.value);
    if (nominal !== nextVal) {
      paradoxDeduced = true;
    }

    currentValue = nextVal;
  }

  if (currentValue !== puzzle.targetValue) {
    return {
      isValid: false,
      score: 0,
      movesTaken: moveSequence.length,
      paradoxDeduced,
      error: `Sequence resulted in value ${currentValue}, expected target ${puzzle.targetValue}.`,
    };
  }

  const movesTaken = moveSequence.length;
  const scoreResult = calculateScore(
    movesTaken,
    puzzle.parMoves,
    unlockedHintTier,
    paradoxDeduced
  );

  return {
    isValid: true,
    score: scoreResult.totalScore,
    movesTaken,
    paradoxDeduced,
  };
};

export const createPlayerStorage = (storage: StorageClient) => {
  const getProgressKey = (userId: string) => `user:${userId}:progress`;
  const getDailyKey = (userId: string, date: string) =>
    `user:${userId}:daily:${date}`;

  const getPlayerProgress = async (
    userId: string,
    username: string,
    todayUtcDate: string
  ): Promise<PlayerProgress> => {
    try {
      const [progressRaw, todayRaw] = await Promise.all([
        storage.get(getProgressKey(userId)),
        storage.get(getDailyKey(userId, todayUtcDate)),
      ]);

      let baseProgress = {
        currentStreak: 0,
        maxStreak: 0,
        totalCompleted: 0,
        lastCompletedDate: null as string | null,
      };

      if (progressRaw) {
        try {
          const parsed = JSON.parse(progressRaw);
          if (isRecord(parsed)) {
            baseProgress = {
              currentStreak:
                typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
              maxStreak: typeof parsed.maxStreak === 'number' ? parsed.maxStreak : 0,
              totalCompleted:
                typeof parsed.totalCompleted === 'number' ? parsed.totalCompleted : 0,
              lastCompletedDate:
                typeof parsed.lastCompletedDate === 'string'
                  ? parsed.lastCompletedDate
                  : null,
            };
          }
        } catch {
          // Ignore corrupt JSON
        }
      }

      let todayRecord: PlayerDailyRecord | null = null;
      if (todayRaw) {
        try {
          const parsed = JSON.parse(todayRaw);
          if (
            isRecord(parsed) &&
            typeof parsed.puzzleId === 'string' &&
            typeof parsed.puzzleDate === 'string' &&
            typeof parsed.score === 'number' &&
            typeof parsed.movesTaken === 'number' &&
            typeof parsed.hintsUsed === 'number' &&
            typeof parsed.completedAt === 'string' &&
            Array.isArray(parsed.moveSequence)
          ) {
            todayRecord = {
              puzzleId: parsed.puzzleId,
              puzzleDate: parsed.puzzleDate,
              completed: Boolean(parsed.completed),
              movesTaken: parsed.movesTaken,
              score: parsed.score,
              hintsUsed: parsed.hintsUsed,
              completedAt: parsed.completedAt,
              moveSequence: parsed.moveSequence.filter(
                (item): item is string => typeof item === 'string'
              ),
            };
          }
        } catch {
          // Ignore corrupt JSON
        }
      }

      return {
        userId,
        username,
        currentStreak: baseProgress.currentStreak,
        maxStreak: baseProgress.maxStreak,
        totalCompleted: baseProgress.totalCompleted,
        lastCompletedDate: baseProgress.lastCompletedDate,
        todayRecord,
      };
    } catch (err) {
      console.error('Error fetching player progress:', err);
      return {
        userId,
        username,
        currentStreak: 0,
        maxStreak: 0,
        totalCompleted: 0,
        lastCompletedDate: null,
        todayRecord: null,
      };
    }
  };

  const savePlayerCompletion = async (
    userId: string,
    username: string,
    record: PlayerDailyRecord
  ): Promise<{ progress: PlayerProgress; isDuplicate: boolean }> => {
    const existing = await getPlayerProgress(userId, username, record.puzzleDate);

    // If already completed for this date
    if (existing.todayRecord !== null) {
      return {
        progress: existing,
        isDuplicate: true,
      };
    }

    const streakResult = calculateUpdatedStreak(
      existing.lastCompletedDate,
      existing.currentStreak,
      existing.maxStreak,
      record.puzzleDate
    );

    const updatedProgress: PlayerProgress = {
      userId,
      username,
      currentStreak: streakResult.currentStreak,
      maxStreak: streakResult.maxStreak,
      totalCompleted: existing.totalCompleted + 1,
      lastCompletedDate: streakResult.lastCompletedDate,
      todayRecord: record,
    };

    try {
      await Promise.all([
        storage.set(
          getProgressKey(userId),
          JSON.stringify({
            currentStreak: updatedProgress.currentStreak,
            maxStreak: updatedProgress.maxStreak,
            totalCompleted: updatedProgress.totalCompleted,
            lastCompletedDate: updatedProgress.lastCompletedDate,
          })
        ),
        storage.set(
          getDailyKey(userId, record.puzzleDate),
          JSON.stringify(record)
        ),
      ]);
    } catch (err) {
      console.error('Error persisting player completion:', err);
    }

    return {
      progress: updatedProgress,
      isDuplicate: false,
    };
  };

  return {
    getPlayerProgress,
    savePlayerCompletion,
  };
};
