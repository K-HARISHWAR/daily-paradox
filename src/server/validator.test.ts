import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validatePuzzleStructure,
  solvePuzzle,
  CURATED_PUZZLES,
} from '../shared/engine/index.ts';
import type { Puzzle, OperationDefinition, Hint } from '../shared/engine/index.ts';

const baseHints: [Hint, Hint, Hint] = [
  { tier: 1, title: 'T1', description: 'Hint 1', penalty: 100 },
  { tier: 2, title: 'T2', description: 'Hint 2', penalty: 250 },
  { tier: 3, title: 'T3', description: 'Hint 3', penalty: 500 },
];

const baseOperations: OperationDefinition[] = [
  { id: 'op_1', label: '+3', type: 'add', value: 3 },
  { id: 'op_2', label: '*2', type: 'multiply', value: 2 },
  {
    id: 'op_paradox',
    label: '+1',
    type: 'add',
    value: 1,
    paradox: { kind: 'offset', delta: 4 }, // adds 5
  },
];

const validPuzzle: Puzzle = {
  id: 'test-puzzle-valid',
  date: '2026-11-23',
  startValue: 2,
  targetValue: 14,
  moveLimit: 5,
  parMoves: 2,
  operations: baseOperations,
  hints: baseHints,
};

void describe('Puzzle Validation & Authoring Utilities', () => {
  void describe('Structure & Schema Validation', () => {
    void it('validates a well-formed puzzle without errors', () => {
      const res = validatePuzzleStructure(validPuzzle);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.errors.length, 0);
      assert.strictEqual(res.paradoxOperationId, 'op_paradox');
      assert.strictEqual(res.isImmediatelyDeducible, true);
    });

    void it('rejects empty or missing ID and invalid date format', () => {
      const badIdAndDate: Puzzle = {
        ...validPuzzle,
        id: '',
        date: '23-11-2026',
      };
      const res = validatePuzzleStructure(badIdAndDate);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.field === 'id'));
      assert.ok(res.errors.some((e) => e.field === 'date'));
    });

    void it('rejects puzzle where startValue equals targetValue', () => {
      const sameValues: Puzzle = {
        ...validPuzzle,
        startValue: 10,
        targetValue: 10,
      };
      const res = validatePuzzleStructure(sameValues);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.field === 'targetValue'));
    });

    void it('rejects invalid moveLimit and parMoves > moveLimit', () => {
      const badLimits: Puzzle = {
        ...validPuzzle,
        moveLimit: 0,
        parMoves: 4,
      };
      const res = validatePuzzleStructure(badLimits);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.field === 'moveLimit'));
      assert.ok(res.errors.some((e) => e.field === 'parMoves'));
    });

    void it('rejects duplicate operation IDs', () => {
      const duplicateOps: Puzzle = {
        ...validPuzzle,
        operations: [
          { id: 'op_dup', label: '+2', type: 'add', value: 2 },
          { id: 'op_dup', label: '+3', type: 'add', value: 3 },
          {
            id: 'op_paradox',
            label: '+1',
            type: 'add',
            value: 1,
            paradox: { kind: 'offset', delta: 1 },
          },
        ],
      };
      const res = validatePuzzleStructure(duplicateOps);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.message.includes('Duplicate operation id')));
    });

    void it('rejects puzzles with 0 or multiple paradox operations', () => {
      // 0 paradoxes
      const noParadox: Puzzle = {
        ...validPuzzle,
        operations: [
          { id: 'op_1', label: '+2', type: 'add', value: 2 },
          { id: 'op_2', label: '*2', type: 'multiply', value: 2 },
        ],
      };
      const res0 = validatePuzzleStructure(noParadox);
      assert.strictEqual(res0.isValid, false);
      assert.ok(res0.errors.some((e) => e.message.includes('found 0')));

      // 2 paradoxes
      const twoParadoxes: Puzzle = {
        ...validPuzzle,
        operations: [
          {
            id: 'op_p1',
            label: '+2',
            type: 'add',
            value: 2,
            paradox: { kind: 'invert' },
          },
          {
            id: 'op_p2',
            label: '*2',
            type: 'multiply',
            value: 2,
            paradox: { kind: 'offset', delta: 1 },
          },
        ],
      };
      const res2 = validatePuzzleStructure(twoParadoxes);
      assert.strictEqual(res2.isValid, false);
      assert.ok(res2.errors.some((e) => e.message.includes('found 2')));
    });

    void it('rejects division by zero in operation definition', () => {
      const divZero: Puzzle = {
        ...validPuzzle,
        operations: [
          { id: 'op_1', label: '/0', type: 'divide', value: 0 },
          {
            id: 'op_p',
            label: '+1',
            type: 'add',
            value: 1,
            paradox: { kind: 'offset', delta: 2 },
          },
        ],
      };
      const res = validatePuzzleStructure(divZero);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.message.includes('division by zero')));
    });

    void it('warns when paradox operation produces identical output on start value', () => {
      const ambiguousOp: Puzzle = {
        ...validPuzzle,
        startValue: 0,
        operations: [
          { id: 'op_1', label: '+3', type: 'add', value: 3 },
          {
            id: 'op_p',
            label: '*2',
            type: 'multiply',
            value: 2,
            paradox: { kind: 'replace', actualType: 'multiply', actualValue: 5 }, // 0 * 2 === 0 * 5 === 0
          },
        ],
      };
      const res = validatePuzzleStructure(ambiguousOp);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.isImmediatelyDeducible, false);
      assert.ok(res.warnings.length > 0);
    });
  });

  void describe('Breadth-First Search Puzzle Solver', () => {
    void it('finds shortest path and intermediate numbers for solvable puzzle', () => {
      // Start 2 -> [op_paradox: +5] = 7 -> [op_2: *2] = 14 (Target!) in 2 moves
      const res = solvePuzzle(validPuzzle);
      assert.strictEqual(res.solvable, true);
      assert.strictEqual(res.minMoves, 2);
      assert.notStrictEqual(res.shortestSolution, null);

      if (res.shortestSolution) {
        assert.deepStrictEqual(res.shortestSolution.path, ['op_paradox', 'op_2']);
        assert.deepStrictEqual(res.shortestSolution.values, [2, 7, 14]);
        assert.strictEqual(res.shortestSolution.moves, 2);
      }
    });

    void it('correctly identifies unsolvable puzzles within move limit', () => {
      const unsolvable: Puzzle = {
        ...validPuzzle,
        targetValue: 999,
        moveLimit: 3,
      };
      const res = solvePuzzle(unsolvable);
      assert.strictEqual(res.solvable, false);
      assert.strictEqual(res.minMoves, -1);
      assert.strictEqual(res.shortestSolution, null);
    });

    void it('avoids runaway exploration and respects depth bounds', () => {
      const largeTarget: Puzzle = {
        ...validPuzzle,
        startValue: 1,
        targetValue: 50000,
        moveLimit: 20,
      };
      const res = solvePuzzle(largeTarget, 4);
      assert.strictEqual(res.maxMovesChecked, 4);
      assert.ok(res.statesExplored <= 15000);
    });
  });

  void describe('Curated Puzzle Catalog Verification', () => {
    void it('ensures all curated puzzles are structurally valid, solvable, and par-accurate', () => {
      assert.ok(CURATED_PUZZLES.length >= 5);

      for (const puzzle of CURATED_PUZZLES) {
        // 1. Structure validation
        const valRes = validatePuzzleStructure(puzzle);
        assert.strictEqual(
          valRes.isValid,
          true,
          `Curated puzzle ${puzzle.id} has validation errors: ${JSON.stringify(valRes.errors)}`
        );
        assert.strictEqual(
          valRes.isImmediatelyDeducible,
          true,
          `Curated puzzle ${puzzle.id} should be immediately deducible from startValue`
        );

        // 2. Solver verification
        const solveRes = solvePuzzle(puzzle);
        assert.strictEqual(
          solveRes.solvable,
          true,
          `Curated puzzle ${puzzle.id} must be solvable within moveLimit (${puzzle.moveLimit})`
        );
        assert.ok(
          solveRes.minMoves <= puzzle.moveLimit,
          `Curated puzzle ${puzzle.id} minMoves (${solveRes.minMoves}) must be <= moveLimit (${puzzle.moveLimit})`
        );
        assert.strictEqual(
          solveRes.minMoves,
          puzzle.parMoves,
          `Curated puzzle ${puzzle.id} declared parMoves (${puzzle.parMoves}) must match solver minMoves (${solveRes.minMoves})`
        );
      }
    });
  });
});
