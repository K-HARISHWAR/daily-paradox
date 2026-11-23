import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  applyMove,
  initGameState,
  resetRun,
  unlockHint,
  markParadoxDeduced,
  sanitizePuzzleForClient,
  applyOperation,
  applyStandard,
  canApplyStandard,
  calculateScore,
} from '../shared/engine/index.ts';
import type {
  Puzzle,
  OperationDefinition,
  Hint,
} from '../shared/engine/index.ts';

const sampleHints: [Hint, Hint, Hint] = [
  { tier: 1, title: 'Nudge', description: 'Watch the +4 button', penalty: 100 },
  { tier: 2, title: 'Suspect', description: 'The +4 button is altered', penalty: 250 },
  { tier: 3, title: 'Reveal', description: 'The +4 button actually adds 6', penalty: 500 },
];

const sampleOperations: OperationDefinition[] = [
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
];

const samplePuzzle: Puzzle = {
  id: 'puzzle_test_01',
  date: '2026-11-23',
  startValue: 3,
  targetValue: 23,
  moveLimit: 5,
  parMoves: 3,
  operations: sampleOperations,
  hints: sampleHints,
};

void describe('Daily Paradox Core Engine', () => {
  void describe('Standard Arithmetic & Division Safety', () => {
    void it('applies standard addition, subtraction, multiplication correctly', () => {
      assert.strictEqual(applyStandard(10, 'add', 5), 15);
      assert.strictEqual(applyStandard(10, 'subtract', 3), 7);
      assert.strictEqual(applyStandard(10, 'multiply', 4), 40);
    });

    void it('safely divides only when evenly divisible', () => {
      assert.strictEqual(applyStandard(10, 'divide', 2), 5);
      assert.strictEqual(canApplyStandard(10, 'divide', 2), true);

      // Non-integer division rejected
      assert.strictEqual(applyStandard(10, 'divide', 3), null);
      assert.strictEqual(canApplyStandard(10, 'divide', 3), false);

      // Division by zero rejected
      assert.strictEqual(applyStandard(10, 'divide', 0), null);
      assert.strictEqual(canApplyStandard(10, 'divide', 0), false);
    });

    void it('respects integer bounds and rejects overflow', () => {
      assert.strictEqual(applyStandard(99990, 'add', 20), null);
      assert.strictEqual(applyStandard(-9990, 'subtract', 20), null);
    });
  });

  void describe('Paradox Operation Behaviors', () => {
    void it('correctly applies offset paradox (adds 6 instead of 4)', () => {
      const op: OperationDefinition = {
        id: 'p_offset',
        label: '+4',
        type: 'add',
        value: 4,
        paradox: { kind: 'offset', delta: 2 },
      };
      assert.strictEqual(applyOperation(3, op), 9);
    });

    void it('correctly applies invert paradox (+ becomes -)', () => {
      const op: OperationDefinition = {
        id: 'p_invert',
        label: '+5',
        type: 'add',
        value: 5,
        paradox: { kind: 'invert' },
      };
      assert.strictEqual(applyOperation(10, op), 5);
    });

    void it('correctly applies replace paradox', () => {
      const op: OperationDefinition = {
        id: 'p_replace',
        label: '+3',
        type: 'add',
        value: 3,
        paradox: { kind: 'replace', actualType: 'multiply', actualValue: 4 },
      };
      assert.strictEqual(applyOperation(5, op), 20);
    });
  });

  void describe('Game State Initialization & Moves', () => {
    void it('initializes game state with puzzle start values', () => {
      const state = initGameState(samplePuzzle);
      assert.strictEqual(state.currentValue, 3);
      assert.strictEqual(state.movesRemaining, 5);
      assert.strictEqual(state.movesTaken, 0);
      assert.strictEqual(state.status, 'idle');
      assert.strictEqual(state.history.length, 0);
      assert.strictEqual(state.score, null);
    });

    void it('applies moves, updates history, and detects paradox divergence', () => {
      const initial = initGameState(samplePuzzle);

      // Apply paradox op (+4 adds 6)
      const res1 = applyMove(initial, samplePuzzle, 'op_paradox');
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.state.currentValue, 9);
      assert.strictEqual(res1.state.movesRemaining, 4);
      assert.strictEqual(res1.state.movesTaken, 1);
      assert.strictEqual(res1.state.status, 'playing');
      assert.strictEqual(res1.state.paradoxDeduced, true);
      assert.strictEqual(res1.state.history.length, 1);

      const firstHistory = res1.state.history[0];
      assert.notStrictEqual(firstHistory, undefined);
      if (firstHistory) {
        assert.strictEqual(firstHistory.beforeValue, 3);
        assert.strictEqual(firstHistory.afterValue, 9);
        assert.strictEqual(firstHistory.nominalExpectedValue, 7);
        assert.strictEqual(firstHistory.isDivergent, true);
      }
    });

    void it('completes full winning solution path', () => {
      const initial = initGameState(samplePuzzle);

      // Step 1: 3 + [paradox: +6] = 9
      const step1 = applyMove(initial, samplePuzzle, 'op_paradox');
      assert.strictEqual(step1.success, true);
      assert.strictEqual(step1.state.currentValue, 9);

      // Step 2: 9 * 2 = 18
      const step2 = applyMove(step1.state, samplePuzzle, 'op_mul2');
      assert.strictEqual(step2.success, true);
      assert.strictEqual(step2.state.currentValue, 18);

      // Step 3: 18 + 5 = 23 (Target reached in par moves!)
      const step3 = applyMove(step2.state, samplePuzzle, 'op_add5');
      assert.strictEqual(step3.success, true);
      assert.strictEqual(step3.state.currentValue, 23);
      assert.strictEqual(step3.state.status, 'won');
      assert.strictEqual(step3.state.movesTaken, 3);
      assert.notStrictEqual(step3.state.score, null);
      // Base (1000) + ParBonus (200) + PureDeduction (150) = 1350
      assert.strictEqual(step3.state.score, 1350);
    });
  });

  void describe('Move Boundaries, Loss Condition & Invalid Actions', () => {
    void it('triggers loss when move limit reached without hitting target', () => {
      const puzzleSmallLimit: Puzzle = {
        ...samplePuzzle,
        moveLimit: 2,
      };
      const initial = initGameState(puzzleSmallLimit);

      // Move 1
      const res1 = applyMove(initial, puzzleSmallLimit, 'op_sub1');
      assert.strictEqual(res1.state.status, 'playing');
      assert.strictEqual(res1.state.movesRemaining, 1);

      // Move 2 (exhausts moves)
      const res2 = applyMove(res1.state, puzzleSmallLimit, 'op_sub1');
      assert.strictEqual(res2.state.status, 'lost');
      assert.strictEqual(res2.state.movesRemaining, 0);
      assert.strictEqual(res2.state.score, null);
    });

    void it('rejects further moves once game is won', () => {
      const initial = initGameState(samplePuzzle);
      const step1 = applyMove(initial, samplePuzzle, 'op_paradox');
      const step2 = applyMove(step1.state, samplePuzzle, 'op_mul2');
      const step3 = applyMove(step2.state, samplePuzzle, 'op_add5');
      assert.strictEqual(step3.state.status, 'won');

      // Attempting move after win
      const postWinMove = applyMove(step3.state, samplePuzzle, 'op_sub1');
      assert.strictEqual(postWinMove.success, false);
      assert.strictEqual(postWinMove.error, 'Game is already won. Cannot apply further moves.');
    });

    void it('rejects further moves once game is lost', () => {
      const puzzle1Move: Puzzle = { ...samplePuzzle, moveLimit: 1 };
      const initial = initGameState(puzzle1Move);
      const res1 = applyMove(initial, puzzle1Move, 'op_sub1');
      assert.strictEqual(res1.state.status, 'lost');

      const res2 = applyMove(res1.state, puzzle1Move, 'op_sub1');
      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.error, 'Game is already lost. Reset the puzzle to play again.');
    });

    void it('rejects unknown operation IDs', () => {
      const initial = initGameState(samplePuzzle);
      const res = applyMove(initial, samplePuzzle, 'non_existent_op');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, "Operation with id 'non_existent_op' not found.");
    });
  });

  void describe('Reset Run & Hint Progression', () => {
    void it('resets state while preserving unlocked hint level and deduction status', () => {
      const initial = initGameState(samplePuzzle);
      const withHint = unlockHint(initial, 2);
      const moved = applyMove(withHint, samplePuzzle, 'op_paradox');
      assert.strictEqual(moved.state.movesTaken, 1);
      assert.strictEqual(moved.state.currentValue, 9);
      assert.strictEqual(moved.state.unlockedHintTier, 2);

      const reset = resetRun(moved.state, samplePuzzle);
      assert.strictEqual(reset.currentValue, samplePuzzle.startValue);
      assert.strictEqual(reset.movesRemaining, samplePuzzle.moveLimit);
      assert.strictEqual(reset.movesTaken, 0);
      assert.strictEqual(reset.status, 'idle');
      assert.strictEqual(reset.history.length, 0);
      assert.strictEqual(reset.unlockedHintTier, 2);
      assert.strictEqual(reset.paradoxDeduced, true);
    });

    void it('only upgrades hint tiers progressively and does not downgrade', () => {
      const initial = initGameState(samplePuzzle);
      const h1 = unlockHint(initial, 1);
      assert.strictEqual(h1.unlockedHintTier, 1);

      const h2 = unlockHint(h1, 2);
      assert.strictEqual(h2.unlockedHintTier, 2);

      // Attempting lower tier does not downgrade
      const h3 = unlockHint(h2, 1);
      assert.strictEqual(h3.unlockedHintTier, 2);
    });

    void it('allows manually marking paradox deduced', () => {
      const initial = initGameState(samplePuzzle);
      assert.strictEqual(initial.paradoxDeduced, false);
      const marked = markParadoxDeduced(initial, true);
      assert.strictEqual(marked.paradoxDeduced, true);
    });
  });

  void describe('Scoring Calculations', () => {
    void it('computes par win with pure deduction bonus', () => {
      const score = calculateScore(3, 3, 0, true);
      assert.strictEqual(score.baseScore, 1000);
      assert.strictEqual(score.parBonus, 200);
      assert.strictEqual(score.extraMovePenalty, 0);
      assert.strictEqual(score.pureDeductionBonus, 150);
      assert.strictEqual(score.hintPenalty, 0);
      assert.strictEqual(score.totalScore, 1350);
    });

    void it('penalizes extra moves beyond par', () => {
      // 5 moves taken when par is 3 (2 extra moves * 50 = -100)
      const score = calculateScore(5, 3, 0, false);
      assert.strictEqual(score.parBonus, 0);
      assert.strictEqual(score.extraMovePenalty, 100);
      assert.strictEqual(score.pureDeductionBonus, 0);
      assert.strictEqual(score.totalScore, 900);
    });

    void it('applies tiered hint penalties and respects minimum floor', () => {
      // Tier 3 hint penalty = 500
      const score = calculateScore(6, 3, 3, false);
      // Base(1000) - ExtraMoves(150) - Hint(500) = 350
      assert.strictEqual(score.totalScore, 350);

      // Heavy penalties cannot breach minimum score floor of 100
      const lowScore = calculateScore(25, 3, 3, false);
      assert.strictEqual(lowScore.totalScore, 100);
    });
  });

  void describe('Client Sanitization & Determinism', () => {
    void it('sanitizes puzzle definition so paradox rules are hidden from client', () => {
      const clientPuzzle = sanitizePuzzleForClient(samplePuzzle);
      assert.strictEqual(clientPuzzle.id, samplePuzzle.id);
      assert.strictEqual(clientPuzzle.operations.length, samplePuzzle.operations.length);

      for (const op of clientPuzzle.operations) {
        assert.strictEqual('paradox' in op, false);
        assert.ok(op.id);
        assert.ok(op.label);
        assert.ok(op.type);
      }
    });

    void it('produces deterministic output across identical run sequences', () => {
      const runSequence = ['op_sub1', 'op_paradox', 'op_mul2'];

      let stateA = initGameState(samplePuzzle);
      for (const opId of runSequence) {
        const res = applyMove(stateA, samplePuzzle, opId);
        assert.strictEqual(res.success, true);
        stateA = res.state;
      }

      let stateB = initGameState(samplePuzzle);
      for (const opId of runSequence) {
        const res = applyMove(stateB, samplePuzzle, opId);
        assert.strictEqual(res.success, true);
        stateB = res.state;
      }

      assert.strictEqual(stateA.currentValue, stateB.currentValue);
      assert.strictEqual(stateA.movesRemaining, stateB.movesRemaining);
      assert.strictEqual(stateA.movesTaken, stateB.movesTaken);
      assert.strictEqual(stateA.status, stateB.status);
      assert.deepStrictEqual(stateA.history, stateB.history);
    });
  });
});
