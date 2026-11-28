import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  compareLeaderboardEntries,
  sortLeaderboard,
  calculateUserRank,
  generateMoveTrail,
  generateShareText,
} from '../shared/engine/index.ts';
import type { LeaderboardEntry } from '../shared/engine/leaderboard.ts';
import type { MoveHistoryItem } from '../shared/engine/types.ts';
import { createPlayerStorage } from './core/storage.ts';
import type { StorageClient } from './core/storage.ts';
import { api } from './routes/api.ts';

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

void describe('Phase 9: Leaderboard, Share Cards, and Community Loop', () => {
  void describe('Leaderboard Ranking & Tie-Breaking Rules', () => {
    void it('ranks higher score first', () => {
      const a: LeaderboardEntry = {
        userId: 'u1',
        username: 'alice',
        score: 1200,
        movesTaken: 4,
        hintsUsed: 0,
        completedAt: '2026-11-23T10:00:00Z',
      };
      const b: LeaderboardEntry = {
        userId: 'u2',
        username: 'bob',
        score: 1350,
        movesTaken: 3,
        hintsUsed: 0,
        completedAt: '2026-11-23T10:05:00Z',
      };

      const sorted = sortLeaderboard([a, b]);
      assert.strictEqual(sorted[0]?.username, 'bob');
      assert.strictEqual(sorted[1]?.username, 'alice');
    });

    void it('breaks score ties by fewer moves taken', () => {
      const a: LeaderboardEntry = {
        userId: 'u1',
        username: 'alice',
        score: 1100,
        movesTaken: 4,
        hintsUsed: 1,
        completedAt: '2026-11-23T10:00:00Z',
      };
      const b: LeaderboardEntry = {
        userId: 'u2',
        username: 'bob',
        score: 1100,
        movesTaken: 3,
        hintsUsed: 2,
        completedAt: '2026-11-23T10:05:00Z',
      };

      const sorted = sortLeaderboard([a, b]);
      assert.strictEqual(sorted[0]?.username, 'bob');
      assert.strictEqual(sorted[1]?.username, 'alice');
    });

    void it('breaks move ties by fewer hints used', () => {
      const a: LeaderboardEntry = {
        userId: 'u1',
        username: 'alice',
        score: 1000,
        movesTaken: 3,
        hintsUsed: 0,
        completedAt: '2026-11-23T10:00:00Z',
      };
      const b: LeaderboardEntry = {
        userId: 'u2',
        username: 'bob',
        score: 1000,
        movesTaken: 3,
        hintsUsed: 1,
        completedAt: '2026-11-23T10:00:00Z',
      };

      const sorted = sortLeaderboard([b, a]);
      assert.strictEqual(sorted[0]?.username, 'alice');
      assert.strictEqual(sorted[1]?.username, 'bob');
    });

    void it('breaks hint ties by earlier completion timestamp', () => {
      const a: LeaderboardEntry = {
        userId: 'u1',
        username: 'alice',
        score: 1000,
        movesTaken: 3,
        hintsUsed: 0,
        completedAt: '2026-11-23T08:00:00Z',
      };
      const b: LeaderboardEntry = {
        userId: 'u2',
        username: 'bob',
        score: 1000,
        movesTaken: 3,
        hintsUsed: 0,
        completedAt: '2026-11-23T09:00:00Z',
      };

      const sorted = sortLeaderboard([b, a]);
      assert.strictEqual(sorted[0]?.username, 'alice');
      assert.strictEqual(sorted[1]?.username, 'bob');
    });

    void it('uses alphabetical username as final deterministic tie-breaker', () => {
      const a: LeaderboardEntry = {
        userId: 'u1',
        username: 'alice',
        score: 1000,
        movesTaken: 3,
        hintsUsed: 0,
        completedAt: '2026-11-23T10:00:00Z',
      };
      const b: LeaderboardEntry = {
        userId: 'u2',
        username: 'bob',
        score: 1000,
        movesTaken: 3,
        hintsUsed: 0,
        completedAt: '2026-11-23T10:00:00Z',
      };

      const cmp = compareLeaderboardEntries(a, b);
      assert.strictEqual(cmp < 0, true);
    });

    void it('calculates user rank correctly', () => {
      const entries: LeaderboardEntry[] = [
        {
          userId: 'u1',
          username: 'first',
          score: 1400,
          movesTaken: 3,
          hintsUsed: 0,
          completedAt: '2026-11-23T10:00:00Z',
        },
        {
          userId: 'u2',
          username: 'second',
          score: 1200,
          movesTaken: 4,
          hintsUsed: 0,
          completedAt: '2026-11-23T10:00:00Z',
        },
      ];

      assert.strictEqual(calculateUserRank(entries, 'u1'), 1);
      assert.strictEqual(calculateUserRank(entries, 'u2'), 2);
      assert.strictEqual(calculateUserRank(entries, 'u999'), null);
    });
  });

  void describe('Storage & Leaderboard Persistence', () => {
    void it('returns empty leaderboard when nobody has played', async () => {
      const storage = createMockStorage();
      const playerStorage = createPlayerStorage(storage);

      const board = await playerStorage.getLeaderboard('2026-11-23');
      assert.strictEqual(board.entries.length, 0);
      assert.strictEqual(board.totalPlayers, 0);
      assert.strictEqual(board.userRank, null);
    });

    void it('updates daily leaderboard upon player completion', async () => {
      const storage = createMockStorage();
      const playerStorage = createPlayerStorage(storage);

      await playerStorage.savePlayerCompletion('user_p1', 'PlayerOne', {
        puzzleId: 'puzzle-2026-11-23',
        puzzleDate: '2026-11-23',
        completed: true,
        movesTaken: 3,
        score: 1350,
        hintsUsed: 0,
        completedAt: '2026-11-23T05:00:00Z',
        moveSequence: ['op_4', 'op_2', 'op_1'],
      });

      await playerStorage.savePlayerCompletion('user_p2', 'PlayerTwo', {
        puzzleId: 'puzzle-2026-11-23',
        puzzleDate: '2026-11-23',
        completed: true,
        movesTaken: 4,
        score: 1100,
        hintsUsed: 1,
        completedAt: '2026-11-23T06:00:00Z',
        moveSequence: ['op_1', 'op_4', 'op_2', 'op_1'],
      });

      const board = await playerStorage.getLeaderboard('2026-11-23', 'user_p2');
      assert.strictEqual(board.totalPlayers, 2);
      assert.strictEqual(board.entries[0]?.username, 'PlayerOne');
      assert.strictEqual(board.entries[0]?.score, 1350);
      assert.strictEqual(board.entries[1]?.username, 'PlayerTwo');
      assert.strictEqual(board.entries[1]?.score, 1100);
      assert.strictEqual(board.userRank, 2);
    });
  });

  void describe('Share Cards & Spoiler Safety', () => {
    const sampleHistory: MoveHistoryItem[] = [
      {
        moveNumber: 1,
        operationId: 'op_paradox',
        operationLabel: '+4',
        beforeValue: 3,
        afterValue: 9,
        nominalExpectedValue: 7,
        isDivergent: true, // Paradox move!
      },
      {
        moveNumber: 2,
        operationId: 'op_mul2',
        operationLabel: '*2',
        beforeValue: 9,
        afterValue: 18,
        nominalExpectedValue: 18,
        isDivergent: false,
      },
      {
        moveNumber: 3,
        operationId: 'op_add5',
        operationLabel: '+5',
        beforeValue: 18,
        afterValue: 23,
        nominalExpectedValue: 23,
        isDivergent: false,
      },
    ];

    void it('generates correct emoji trail for divergent and nominal moves', () => {
      const trail = generateMoveTrail(sampleHistory, true);
      assert.strictEqual(trail, '🟪 🟦 🟦 🎯');
    });

    void it('generates compact spoiler-free summary by default', () => {
      const share = generateShareText({
        epochDay: 20780,
        puzzleDate: '2026-11-23',
        isWon: true,
        movesTaken: 3,
        parMoves: 3,
        score: 1350,
        hintsUsed: 0,
        currentStreak: 4,
        subredditName: 'daily_paradox_dev',
        history: sampleHistory,
        includeReveal: false,
        paradoxOperationLabel: '+4',
        paradoxDescription: 'actually adds 6',
      });

      assert.match(share, /Daily Paradox #20780/);
      assert.match(share, /Solved in 3 moves/);
      assert.match(share, /1350 pts/);
      assert.match(share, /Streak: 4 days/);
      assert.match(share, /Trail: 🟪 🟦 🟦 🎯/);
      assert.match(share, /r\/daily_paradox_dev/);
      // MUST NOT contain the secret reveal when includeReveal is false
      assert.strictEqual(share.includes('actually adds 6'), false);
      assert.strictEqual(share.includes('Spoiler:'), false);
    });

    void it('includes spoiler-tagged secret rule only when includeReveal is true', () => {
      const share = generateShareText({
        epochDay: 20780,
        puzzleDate: '2026-11-23',
        isWon: true,
        movesTaken: 3,
        parMoves: 3,
        score: 1350,
        hintsUsed: 0,
        currentStreak: 4,
        subredditName: 'daily_paradox_dev',
        history: sampleHistory,
        includeReveal: true,
        paradoxOperationLabel: '+4',
        paradoxDescription: 'actually adds 6',
      });

      assert.match(share, /Spoiler: >!Secret Rule: \[\+4\] actually adds 6!<$/);
    });
  });

  void describe('GET /api/leaderboard API Endpoint', () => {
    void it('returns 200 with leaderboard payload', async () => {
      const req = new Request('http://localhost/leaderboard?date=2026-11-23');
      const res = await api.fetch(req);
      assert.strictEqual(res.status, 200);

      const json: unknown = await res.json();
      assert.strictEqual(typeof json, 'object');
      if (typeof json === 'object' && json !== null) {
        assert.strictEqual('type' in json && json.type === 'leaderboard', true);
        assert.strictEqual('entries' in json && Array.isArray(json.entries), true);
        assert.strictEqual('totalPlayers' in json, true);
      }
    });
  });
});
