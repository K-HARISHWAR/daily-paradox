import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createPlayerStorage,
  validateMoveSequence,
} from './core/storage.ts';
import type { StorageClient } from './core/storage.ts';
import {
  calculateUpdatedStreak,
  CURATED_PUZZLES,
} from '../shared/engine/index.ts';
import type { PlayerDailyRecord, Puzzle } from '../shared/engine/types.ts';

const createMockStorage = (): StorageClient => {
  const store = new Map<string, string>();
  return {
    get: async (key: string): Promise<string | undefined> => {
      return store.get(key);
    },
    set: async (key: string, value: string): Promise<unknown> => {
      store.set(key, value);
      return 'OK';
    },
  };
};

const samplePuzzle: Puzzle = CURATED_PUZZLES[0] ?? {
  id: 'puzzle-2026-11-23',
  date: '2026-11-23',
  startValue: 3,
  targetValue: 23,
  moveLimit: 5,
  parMoves: 3,
  operations: [
    { id: 'op_add5', label: '+5', type: 'add', value: 5 },
    { id: 'op_mul2', label: '*2', type: 'multiply', value: 2 },
    { id: 'op_sub1', label: '-1', type: 'subtract', value: 1 },
    {
      id: 'op_paradox',
      label: '+4',
      type: 'add',
      value: 4,
      paradox: { kind: 'offset', delta: 2 }, // adds 6
    },
  ],
  hints: [
    { tier: 1, title: 'Nudge', description: 'Observe', penalty: 100 },
    { tier: 2, title: 'Suspect', description: 'Suspect', penalty: 250 },
    { tier: 3, title: 'Reveal', description: 'Reveal', penalty: 500 },
  ],
};

void describe('Phase 7: Persistence and Player Progress', () => {
  void describe('Streak Rules & Transitions', () => {
    void it('initializes streak to 1 on first-ever completion', () => {
      const res = calculateUpdatedStreak(null, 0, 0, '2026-11-23');
      assert.strictEqual(res.currentStreak, 1);
      assert.strictEqual(res.maxStreak, 1);
      assert.strictEqual(res.lastCompletedDate, '2026-11-23');
      assert.strictEqual(res.isDuplicate, false);
    });

    void it('increments streak when completed on the consecutive next day', () => {
      const res = calculateUpdatedStreak('2026-11-23', 1, 1, '2026-11-24');
      assert.strictEqual(res.currentStreak, 2);
      assert.strictEqual(res.maxStreak, 2);
      assert.strictEqual(res.lastCompletedDate, '2026-11-24');
      assert.strictEqual(res.isDuplicate, false);
    });

    void it('handles duplicate completions on the same UTC date without incrementing', () => {
      const res = calculateUpdatedStreak('2026-11-24', 2, 2, '2026-11-24');
      assert.strictEqual(res.currentStreak, 2);
      assert.strictEqual(res.maxStreak, 2);
      assert.strictEqual(res.lastCompletedDate, '2026-11-24');
      assert.strictEqual(res.isDuplicate, true);
    });

    void it('resets streak to 1 when a day is skipped but preserves maxStreak', () => {
      // Last played on 2026-11-24, played again on 2026-11-26 (missed 2026-11-25)
      const res = calculateUpdatedStreak('2026-11-24', 5, 5, '2026-11-26');
      assert.strictEqual(res.currentStreak, 1);
      assert.strictEqual(res.maxStreak, 5);
      assert.strictEqual(res.lastCompletedDate, '2026-11-26');
      assert.strictEqual(res.isDuplicate, false);
    });
  });

  void describe('Storage Service Layer & In-Memory Redis Adapter', () => {
    void it('returns zeroed progress for a first-time player', async () => {
      const mockStorage = createMockStorage();
      const storage = createPlayerStorage(mockStorage);

      const progress = await storage.getPlayerProgress('user_123', 'snoo_user', '2026-11-23');
      assert.strictEqual(progress.userId, 'user_123');
      assert.strictEqual(progress.username, 'snoo_user');
      assert.strictEqual(progress.currentStreak, 0);
      assert.strictEqual(progress.maxStreak, 0);
      assert.strictEqual(progress.totalCompleted, 0);
      assert.strictEqual(progress.lastCompletedDate, null);
      assert.strictEqual(progress.todayRecord, null);
    });

    void it('saves first completion, advances streak, and updates totalCompleted', async () => {
      const mockStorage = createMockStorage();
      const storage = createPlayerStorage(mockStorage);

      const record: PlayerDailyRecord = {
        puzzleId: 'puzzle-2026-11-23',
        puzzleDate: '2026-11-23',
        completed: true,
        movesTaken: 3,
        score: 1350,
        hintsUsed: 0,
        completedAt: new Date().toISOString(),
        moveSequence: ['op_paradox', 'op_mul2', 'op_add5'],
      };

      const result = await storage.savePlayerCompletion('user_123', 'snoo_user', record);
      assert.strictEqual(result.isDuplicate, false);
      assert.strictEqual(result.progress.currentStreak, 1);
      assert.strictEqual(result.progress.maxStreak, 1);
      assert.strictEqual(result.progress.totalCompleted, 1);
      assert.strictEqual(result.progress.lastCompletedDate, '2026-11-23');

      // Subsequent read returns todayRecord
      const fetched = await storage.getPlayerProgress('user_123', 'snoo_user', '2026-11-23');
      assert.notStrictEqual(fetched.todayRecord, null);
      assert.strictEqual(fetched.todayRecord?.score, 1350);
      assert.strictEqual(fetched.todayRecord?.movesTaken, 3);
    });

    void it('rejects duplicate completion requests gracefully', async () => {
      const mockStorage = createMockStorage();
      const storage = createPlayerStorage(mockStorage);

      const record: PlayerDailyRecord = {
        puzzleId: 'puzzle-2026-11-23',
        puzzleDate: '2026-11-23',
        completed: true,
        movesTaken: 3,
        score: 1350,
        hintsUsed: 0,
        completedAt: new Date().toISOString(),
        moveSequence: ['op_paradox', 'op_mul2', 'op_add5'],
      };

      await storage.savePlayerCompletion('user_123', 'snoo_user', record);

      // Attempt duplicate submit
      const dup = await storage.savePlayerCompletion('user_123', 'snoo_user', record);
      assert.strictEqual(dup.isDuplicate, true);
      assert.strictEqual(dup.progress.totalCompleted, 1);
      assert.strictEqual(dup.progress.currentStreak, 1);
    });

    void it('tolerates corrupted or invalid JSON in storage without crashing', async () => {
      const mockStorage = createMockStorage();
      await mockStorage.set('user:corrupt_user:progress', '{bad json');
      await mockStorage.set('user:corrupt_user:daily:2026-11-23', 'null');

      const storage = createPlayerStorage(mockStorage);
      const progress = await storage.getPlayerProgress('corrupt_user', 'anon', '2026-11-23');
      assert.strictEqual(progress.currentStreak, 0);
      assert.strictEqual(progress.totalCompleted, 0);
      assert.strictEqual(progress.todayRecord, null);
    });
  });

  void describe('Server-Side Move Sequence Validation', () => {
    void it('validates correct winning move sequence and calculates official score', () => {
      // 3 -> [op_paradox (+6)] = 9 -> [op_mul2 (*2)] = 18 -> [op_add5 (+5)] = 23 (target reached)
      const res = validateMoveSequence(samplePuzzle, ['op_paradox', 'op_mul2', 'op_add5'], 0);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.movesTaken, 3);
      assert.strictEqual(res.paradoxDeduced, true);
      assert.strictEqual(res.score, 1350);
    });

    void it('rejects sequence that fails to hit target', () => {
      const res = validateMoveSequence(samplePuzzle, ['op_sub1', 'op_mul2'], 0);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('expected target'));
    });

    void it('rejects sequence exceeding puzzle move limit', () => {
      const longSequence = ['op_sub1', 'op_sub1', 'op_sub1', 'op_sub1', 'op_sub1', 'op_sub1'];
      const res = validateMoveSequence(samplePuzzle, longSequence, 0);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('exceeds move limit'));
    });

    void it('rejects sequence with invalid or unknown operation IDs', () => {
      const res = validateMoveSequence(samplePuzzle, ['op_hacked_button'], 0);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('Unknown operation ID'));
    });

    void it('rejects empty move sequence', () => {
      const res = validateMoveSequence(samplePuzzle, [], 0);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('cannot be empty'));
    });
  });
});
