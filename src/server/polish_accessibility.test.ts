import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  initGameState,
  applyMove,
  resetRun,
  CURATED_PUZZLES,
  sanitizePuzzleForClient,
  formatTimeUntilReset,
  getMillisecondsUntilNextUtcReset,
} from '../shared/engine/index.ts';

void describe('Phase 10: Accessibility, Responsive Design, and Polish', () => {
  const samplePuzzle = CURATED_PUZZLES[0] ?? {
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
        paradox: { kind: 'offset', delta: 2 },
      },
    ],
    hints: [
      { tier: 1, title: 'Nudge', description: 'Observe', penalty: 100 },
      { tier: 2, title: 'Suspect', description: 'Suspect', penalty: 250 },
      { tier: 3, title: 'Reveal', description: 'Reveal', penalty: 500 },
    ],
  };

  void describe('State Stability & Anti-Corruption', () => {
    void it('rejects moves once game status is won', () => {
      let state = initGameState(samplePuzzle);
      // Winning sequence: +4 (adds 6 -> 9), *2 (-> 18), +5 (-> 23)
      const move1 = applyMove(state, samplePuzzle, 'op_paradox');
      assert.strictEqual(move1.success, true);
      state = move1.state;

      const move2 = applyMove(state, samplePuzzle, 'op_mul2');
      assert.strictEqual(move2.success, true);
      state = move2.state;

      const move3 = applyMove(state, samplePuzzle, 'op_add5');
      assert.strictEqual(move3.success, true);
      state = move3.state;
      assert.strictEqual(state.status, 'won');

      // Attempting any subsequent move must fail cleanly without corrupting state
      const postWinMove = applyMove(state, samplePuzzle, 'op_sub1');
      assert.strictEqual(postWinMove.success, false);
      assert.strictEqual(postWinMove.state.status, 'won');
      assert.strictEqual(postWinMove.state.movesTaken, 3);
      assert.match(postWinMove.error ?? '', /already won/i);
    });

    void it('rejects moves once game status is lost (move limit reached)', () => {
      let state = initGameState(samplePuzzle);
      // Consume all 5 moves without reaching 23
      for (let i = 0; i < 5; i += 1) {
        const res = applyMove(state, samplePuzzle, 'op_sub1');
        assert.strictEqual(res.success, true);
        state = res.state;
      }
      assert.strictEqual(state.status, 'lost');
      assert.strictEqual(state.movesRemaining, 0);

      // Subsequent move is rejected
      const overflowMove = applyMove(state, samplePuzzle, 'op_sub1');
      assert.strictEqual(overflowMove.success, false);
      assert.strictEqual(overflowMove.state.status, 'lost');
      assert.match(overflowMove.error ?? '', /already lost/i);
    });

    void it('resets cleanly back to initial values after loss or win', () => {
      let state = initGameState(samplePuzzle);
      const res = applyMove(state, samplePuzzle, 'op_sub1');
      state = res.state;
      assert.strictEqual(state.movesTaken, 1);

      const resetState = resetRun(state, samplePuzzle);
      assert.strictEqual(resetState.movesTaken, 0);
      assert.strictEqual(resetState.movesRemaining, samplePuzzle.moveLimit);
      assert.strictEqual(resetState.currentValue, samplePuzzle.startValue);
      assert.strictEqual(resetState.status, 'idle');
      assert.strictEqual(resetState.history.length, 0);
    });
  });

  void describe('Client Sanitization & Non-Leak Guarantee', () => {
    void it('completely strips paradox behaviors from client operations', () => {
      const sanitized = sanitizePuzzleForClient(samplePuzzle);
      assert.strictEqual(sanitized.operations.length, samplePuzzle.operations.length);

      for (const clientOp of sanitized.operations) {
        assert.strictEqual('paradox' in clientOp, false);
        assert.strictEqual(typeof clientOp.id, 'string');
        assert.strictEqual(typeof clientOp.label, 'string');
        assert.strictEqual(typeof clientOp.type, 'string');
        assert.strictEqual(typeof clientOp.value, 'number');
      }
    });
  });

  void describe('Formatting & Time Display Accessibility', () => {
    void it('formats countdown cleanly without NaN or negative values', () => {
      assert.strictEqual(formatTimeUntilReset(0), '00h 00m 00s');
      assert.strictEqual(formatTimeUntilReset(-5000), '00h 00m 00s');
      assert.strictEqual(formatTimeUntilReset(3661000), '01h 01m 01s');
    });

    void it('calculates positive remaining milliseconds to next reset', () => {
      const ms = getMillisecondsUntilNextUtcReset();
      assert.strictEqual(ms > 0, true);
      assert.strictEqual(ms <= 86400000, true);
    });
  });

  void describe('Curated Puzzle UX & Quality Verification', () => {
    void it('all curated puzzles have accessible labels and distinct values', () => {
      for (const puzzle of CURATED_PUZZLES) {
        assert.strictEqual(puzzle.startValue !== puzzle.targetValue, true);
        assert.strictEqual(puzzle.parMoves <= puzzle.moveLimit, true);
        assert.strictEqual(puzzle.hints.length, 3);
        assert.strictEqual(puzzle.operations.length >= 3, true);

        for (const op of puzzle.operations) {
          assert.strictEqual(op.label.length >= 2, true);
          assert.strictEqual(op.value > 0, true);
        }
      }
    });
  });
});
