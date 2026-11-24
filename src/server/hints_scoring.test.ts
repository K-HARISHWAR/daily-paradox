import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  initGameState,
  unlockHint,
  resetRun,
  applyMove,
  calculateScore,
  CURATED_PUZZLES,
} from '../shared/engine/index.ts';
import type { Puzzle, OperationDefinition, Hint } from '../shared/engine/index.ts';

const testHints: [Hint, Hint, Hint] = [
  { tier: 1, title: 'Observe Ops', description: 'Look at the addition buttons', penalty: 100 },
  { tier: 2, title: 'Suspect Button', description: 'The +4 button is suspect', penalty: 250 },
  { tier: 3, title: 'Secret Twist', description: 'The +4 button actually adds 6', penalty: 500 },
];

const testOps: OperationDefinition[] = [
  { id: 'op_add1', label: '+1', type: 'add', value: 1 },
  {
    id: 'op_paradox',
    label: '+4',
    type: 'add',
    value: 4,
    paradox: { kind: 'offset', delta: 2 }, // adds 6
  },
];

const samplePuzzle: Puzzle = {
  id: 'hints_test_puzzle',
  date: '2026-11-23',
  startValue: 3,
  targetValue: 9,
  moveLimit: 5,
  parMoves: 1, // op_paradox: 3 + 6 = 9 in 1 move
  operations: testOps,
  hints: testHints,
};

void describe('Phase 5: Onboarding, Hints, and Scoring Engine', () => {
  void describe('Hint Progression & State Isolation', () => {
    void it('starts with zero hints unlocked and increments monotonically', () => {
      const state0 = initGameState(samplePuzzle);
      assert.strictEqual(state0.unlockedHintTier, 0);

      const state1 = unlockHint(state0, 1);
      assert.strictEqual(state1.unlockedHintTier, 1);

      const state2 = unlockHint(state1, 2);
      assert.strictEqual(state2.unlockedHintTier, 2);

      const state3 = unlockHint(state2, 3);
      assert.strictEqual(state3.unlockedHintTier, 3);

      // Attempting to unlock lower or equal tier does not downgrade
      const stateAgain = unlockHint(state3, 1);
      assert.strictEqual(stateAgain.unlockedHintTier, 3);
    });

    void it('does not mutate arithmetic state or consume moves when unlocking hints', () => {
      const state0 = initGameState(samplePuzzle);
      const withMove = applyMove(state0, samplePuzzle, 'op_add1');
      assert.strictEqual(withMove.state.currentValue, 4);
      assert.strictEqual(withMove.state.movesTaken, 1);
      assert.strictEqual(withMove.state.movesRemaining, 4);

      const withHint = unlockHint(withMove.state, 2);
      assert.strictEqual(withHint.currentValue, 4);
      assert.strictEqual(withHint.movesTaken, 1);
      assert.strictEqual(withHint.movesRemaining, 4);
      assert.strictEqual(withHint.history.length, 1);
      assert.strictEqual(withHint.unlockedHintTier, 2);
    });

    void it('preserves unlocked hints across run resets', () => {
      const state0 = initGameState(samplePuzzle);
      const withHint = unlockHint(state0, 2);
      const withMove = applyMove(withHint, samplePuzzle, 'op_add1');
      assert.strictEqual(withMove.state.currentValue, 4);
      assert.strictEqual(withMove.state.movesTaken, 1);
      assert.strictEqual(withMove.state.unlockedHintTier, 2);

      const resetState = resetRun(withMove.state, samplePuzzle);
      assert.strictEqual(resetState.currentValue, samplePuzzle.startValue);
      assert.strictEqual(resetState.movesTaken, 0);
      assert.strictEqual(resetState.movesRemaining, samplePuzzle.moveLimit);
      assert.strictEqual(resetState.history.length, 0);
      // Hints remain unlocked!
      assert.strictEqual(resetState.unlockedHintTier, 2);
    });
  });

  void describe('Transparent Scoring Formula & Edge Cases', () => {
    void it('awards maximum score (1,350 pts) for par finish with pure deduction', () => {
      // movesTaken = 1, parMoves = 1, hints = 0, paradoxDeduced = true
      const breakdown = calculateScore(1, 1, 0, true);
      assert.strictEqual(breakdown.baseScore, 1000);
      assert.strictEqual(breakdown.parBonus, 200);
      assert.strictEqual(breakdown.extraMovePenalty, 0);
      assert.strictEqual(breakdown.pureDeductionBonus, 150);
      assert.strictEqual(breakdown.hintPenalty, 0);
      assert.strictEqual(breakdown.totalScore, 1350);
    });

    void it('penalizes Tier 1 hint (-100 pts) while retaining pure deduction bonus', () => {
      // Tier 1 hint only nudges observation, does not reveal suspect or answer
      const breakdown = calculateScore(1, 1, 1, true);
      assert.strictEqual(breakdown.baseScore, 1000);
      assert.strictEqual(breakdown.parBonus, 200);
      assert.strictEqual(breakdown.pureDeductionBonus, 150);
      assert.strictEqual(breakdown.hintPenalty, 100);
      // 1000 + 200 + 150 - 100 = 1250
      assert.strictEqual(breakdown.totalScore, 1250);
    });

    void it('penalizes Tier 2 hint (-250 pts) and forfeits pure deduction bonus', () => {
      // Tier 2 reveals the suspect button, so pure deduction is forfeited
      const breakdown = calculateScore(1, 1, 2, true);
      assert.strictEqual(breakdown.baseScore, 1000);
      assert.strictEqual(breakdown.parBonus, 200);
      assert.strictEqual(breakdown.pureDeductionBonus, 0);
      assert.strictEqual(breakdown.hintPenalty, 250);
      // 1000 + 200 - 250 = 950
      assert.strictEqual(breakdown.totalScore, 950);
    });

    void it('penalizes Tier 3 hint (-500 pts) and forfeits pure deduction bonus', () => {
      const breakdown = calculateScore(1, 1, 3, true);
      assert.strictEqual(breakdown.baseScore, 1000);
      assert.strictEqual(breakdown.parBonus, 200);
      assert.strictEqual(breakdown.pureDeductionBonus, 0);
      assert.strictEqual(breakdown.hintPenalty, 500);
      // 1000 + 200 - 500 = 700
      assert.strictEqual(breakdown.totalScore, 700);
    });

    void it('penalizes extra moves beyond par (-50 pts per move)', () => {
      // par is 1, took 3 moves (2 extra moves * 50 = 100 penalty)
      const breakdown = calculateScore(3, 1, 0, false);
      assert.strictEqual(breakdown.baseScore, 1000);
      assert.strictEqual(breakdown.parBonus, 0);
      assert.strictEqual(breakdown.extraMovePenalty, 100);
      assert.strictEqual(breakdown.pureDeductionBonus, 0);
      assert.strictEqual(breakdown.hintPenalty, 0);
      // 1000 - 100 = 900
      assert.strictEqual(breakdown.totalScore, 900);
    });

    void it('enforces guaranteed minimum score floor of 100 pts on win', () => {
      // 30 extra moves (1500 penalty) + Tier 3 hint (500 penalty)
      const breakdown = calculateScore(31, 1, 3, false);
      assert.strictEqual(breakdown.totalScore, 100);
    });
  });

  void describe('Catalog Hint Integrity', () => {
    void it('confirms all curated puzzles have complete, ordered, tiered hints', () => {
      for (const puzzle of CURATED_PUZZLES) {
        assert.strictEqual(puzzle.hints.length, 3);
        const [h1, h2, h3] = puzzle.hints;
        assert.strictEqual(h1.tier, 1);
        assert.strictEqual(h1.penalty, 100);
        assert.ok(h1.title.length > 0);
        assert.ok(h1.description.length > 0);

        assert.strictEqual(h2.tier, 2);
        assert.strictEqual(h2.penalty, 250);
        assert.ok(h2.title.length > 0);
        assert.ok(h2.description.length > 0);

        assert.strictEqual(h3.tier, 3);
        assert.strictEqual(h3.penalty, 500);
        assert.ok(h3.title.length > 0);
        assert.ok(h3.description.length > 0);
      }
    });
  });
});
