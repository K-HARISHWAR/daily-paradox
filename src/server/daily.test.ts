import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getUtcDateString,
  parseUtcDateString,
  getEpochDayIndex,
  getMillisecondsUntilNextUtcReset,
  formatTimeUntilReset,
  getDailyPuzzle,
  CURATED_PUZZLES,
} from '../shared/engine/index.ts';

void describe('Phase 6: Daily Puzzle System & Timezone Logic', () => {
  void describe('UTC Date Parsing & Midnight Boundaries', () => {
    void it('formats UTC date string cleanly as YYYY-MM-DD', () => {
      const fixedDate = new Date(Date.UTC(2026, 10, 24, 15, 30, 0)); // Nov 24, 2026
      assert.strictEqual(getUtcDateString(fixedDate), '2026-11-24');
    });

    void it('correctly transitions date at 00:00:00 UTC boundary', () => {
      const beforeMidnight = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));
      const atMidnight = new Date(Date.UTC(2027, 0, 1, 0, 0, 0, 0));

      assert.strictEqual(getUtcDateString(beforeMidnight), '2026-12-31');
      assert.strictEqual(getUtcDateString(atMidnight), '2027-01-01');
    });

    void it('parses valid UTC date strings and rejects invalid dates', () => {
      const parsed = parseUtcDateString('2026-11-24');
      assert.notStrictEqual(parsed, null);
      if (parsed) {
        assert.strictEqual(parsed.getUTCFullYear(), 2026);
        assert.strictEqual(parsed.getUTCMonth(), 10);
        assert.strictEqual(parsed.getUTCDate(), 24);
      }

      // Invalid calendar days & formats
      assert.strictEqual(parseUtcDateString('invalid-string'), null);
      assert.strictEqual(parseUtcDateString('2026/11/24'), null);
      assert.strictEqual(parseUtcDateString('2026-13-01'), null); // Month 13
      assert.strictEqual(parseUtcDateString('2026-02-31'), null); // Feb 31 does not exist
      assert.strictEqual(parseUtcDateString('2026-04-31'), null); // April 31 does not exist
    });
  });

  void describe('Reset Countdown Calculation', () => {
    void it('calculates exact milliseconds until next 00:00 UTC', () => {
      // 23:00:00 UTC -> exactly 1 hour (3,600,000 ms) until next midnight
      const time = new Date(Date.UTC(2026, 10, 24, 23, 0, 0, 0));
      const ms = getMillisecondsUntilNextUtcReset(time);
      assert.strictEqual(ms, 3600000);
    });

    void it('formats countdown text as hh:mm:ss', () => {
      const oneHourOneMinOneSec = 3600000 + 60000 + 1000;
      assert.strictEqual(formatTimeUntilReset(oneHourOneMinOneSec), '01h 01m 01s');

      const tenSeconds = 10000;
      assert.strictEqual(formatTimeUntilReset(tenSeconds), '00h 00m 10s');
    });
  });

  void describe('Deterministic Daily Puzzle Resolution', () => {
    void it('returns identical puzzle across repeated calls for same date', () => {
      const p1 = getDailyPuzzle('2026-11-23');
      const p2 = getDailyPuzzle('2026-11-23');

      assert.strictEqual(p1.id, p2.id);
      assert.strictEqual(p1.startValue, p2.startValue);
      assert.strictEqual(p1.targetValue, p2.targetValue);
      assert.strictEqual(p1.moveLimit, p2.moveLimit);
      assert.deepStrictEqual(p1.operations, p2.operations);
    });

    void it('matches exact curated puzzles for dates in the catalog', () => {
      for (const expected of CURATED_PUZZLES) {
        const resolved = getDailyPuzzle(expected.date);
        assert.strictEqual(resolved.id, expected.id);
        assert.strictEqual(resolved.startValue, expected.startValue);
        assert.strictEqual(resolved.targetValue, expected.targetValue);
      }
    });

    void it('deterministically cycles for arbitrary future dates without crashing', () => {
      const future1 = getDailyPuzzle('2027-04-15');
      const future2 = getDailyPuzzle('2027-04-15');
      assert.strictEqual(future1.id, future2.id);
      assert.strictEqual(future1.date, '2027-04-15');
      assert.ok(future1.operations.length >= 2);

      const dayIdxA = getEpochDayIndex('2027-04-15');
      const dayIdxB = getEpochDayIndex('2027-04-16');
      assert.strictEqual(dayIdxB - dayIdxA, 1);
    });
  });

  void describe('Development Overrides', () => {
    void it('allows overriding puzzle by ID regardless of date', () => {
      const override = getDailyPuzzle('2026-11-23', 'puzzle-2026-11-25');
      assert.strictEqual(override.id, 'puzzle-2026-11-25');
      assert.strictEqual(override.startValue, 5);
      assert.strictEqual(override.targetValue, 27);
    });

    void it('allows overriding puzzle by index in catalog', () => {
      const override0 = getDailyPuzzle(undefined, 0);
      assert.strictEqual(override0.id, CURATED_PUZZLES[0]?.id);

      const override1 = getDailyPuzzle(undefined, 1);
      assert.strictEqual(override1.id, CURATED_PUZZLES[1]?.id);
    });

    void it('falls back to date puzzle if invalid override ID provided', () => {
      const fallback = getDailyPuzzle('2026-11-23', 'non-existent-puzzle-id');
      assert.strictEqual(fallback.date, '2026-11-23');
      assert.strictEqual(fallback.id, 'puzzle-2026-11-23');
    });
  });
});
