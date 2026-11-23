import { applyOperation, applyStandard } from './operations.ts';
import type { OperationDefinition, Puzzle } from './types.ts';

export type PuzzleValidationError = {
  field: string;
  message: string;
};

export type PuzzleValidationResult = {
  isValid: boolean;
  errors: PuzzleValidationError[];
  warnings: string[];
  paradoxOperationId: string | null;
  isImmediatelyDeducible: boolean;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const validatePuzzleStructure = (puzzle: Puzzle): PuzzleValidationResult => {
  const errors: PuzzleValidationError[] = [];
  const warnings: string[] = [];

  if (!puzzle.id || puzzle.id.trim().length === 0) {
    errors.push({ field: 'id', message: 'Puzzle ID is required.' });
  }

  if (!puzzle.date || !DATE_REGEX.test(puzzle.date)) {
    errors.push({
      field: 'date',
      message: "Puzzle date must be formatted as 'YYYY-MM-DD'.",
    });
  }

  if (typeof puzzle.startValue !== 'number' || !Number.isInteger(puzzle.startValue)) {
    errors.push({ field: 'startValue', message: 'startValue must be an integer.' });
  }

  if (typeof puzzle.targetValue !== 'number' || !Number.isInteger(puzzle.targetValue)) {
    errors.push({ field: 'targetValue', message: 'targetValue must be an integer.' });
  }

  if (puzzle.startValue === puzzle.targetValue) {
    errors.push({
      field: 'targetValue',
      message: 'targetValue cannot equal startValue.',
    });
  }

  if (typeof puzzle.moveLimit !== 'number' || puzzle.moveLimit <= 0) {
    errors.push({
      field: 'moveLimit',
      message: 'moveLimit must be a positive integer greater than 0.',
    });
  }

  if (typeof puzzle.parMoves !== 'number' || puzzle.parMoves <= 0) {
    errors.push({
      field: 'parMoves',
      message: 'parMoves must be a positive integer greater than 0.',
    });
  } else if (puzzle.parMoves > puzzle.moveLimit) {
    errors.push({
      field: 'parMoves',
      message: `parMoves (${puzzle.parMoves}) cannot exceed moveLimit (${puzzle.moveLimit}).`,
    });
  }

  if (!Array.isArray(puzzle.operations) || puzzle.operations.length < 2) {
    errors.push({
      field: 'operations',
      message: 'Puzzle must have at least 2 operations.',
    });
  }

  const seenIds = new Set<string>();
  const paradoxOps: OperationDefinition[] = [];

  if (Array.isArray(puzzle.operations)) {
    for (const op of puzzle.operations) {
      if (!op.id || op.id.trim().length === 0) {
        errors.push({ field: 'operations', message: 'Every operation must have an id.' });
      } else if (seenIds.has(op.id)) {
        errors.push({
          field: 'operations',
          message: `Duplicate operation id found: '${op.id}'.`,
        });
      } else {
        seenIds.add(op.id);
      }

      if (!op.label || op.label.trim().length === 0) {
        errors.push({ field: 'operations', message: `Operation '${op.id}' must have a label.` });
      }

      if (op.type === 'divide' && op.value === 0) {
        errors.push({
          field: 'operations',
          message: `Operation '${op.id}' has division by zero.`,
        });
      }

      if (op.paradox !== undefined) {
        paradoxOps.push(op);
      }
    }
  }

  if (paradoxOps.length === 0) {
    errors.push({
      field: 'operations',
      message: 'Puzzle must contain exactly one paradox operation (found 0).',
    });
  } else if (paradoxOps.length > 1) {
    errors.push({
      field: 'operations',
      message: `Puzzle must contain exactly one paradox operation (found ${paradoxOps.length}).`,
    });
  }

  if (!Array.isArray(puzzle.hints) || puzzle.hints.length !== 3) {
    errors.push({ field: 'hints', message: 'Puzzle must contain exactly 3 hints (tiers 1, 2, 3).' });
  } else {
    const [h1, h2, h3] = puzzle.hints;
    if (h1 && h1.tier !== 1) errors.push({ field: 'hints', message: 'First hint must be tier 1.' });
    if (h2 && h2.tier !== 2) errors.push({ field: 'hints', message: 'Second hint must be tier 2.' });
    if (h3 && h3.tier !== 3) errors.push({ field: 'hints', message: 'Third hint must be tier 3.' });
  }

  const paradoxOp = paradoxOps.length === 1 ? paradoxOps[0] : null;
  let isImmediatelyDeducible = false;

  if (paradoxOp && Number.isInteger(puzzle.startValue)) {
    const nominalAtStart = applyStandard(puzzle.startValue, paradoxOp.type, paradoxOp.value);
    const actualAtStart = applyOperation(puzzle.startValue, paradoxOp);

    if (actualAtStart !== null && nominalAtStart !== null && actualAtStart !== nominalAtStart) {
      isImmediatelyDeducible = true;
    } else {
      warnings.push(
        `Paradox operation '${paradoxOp.id}' (${paradoxOp.label}) produces identical or invalid output on startValue ${puzzle.startValue}. It cannot be deduced on the first move.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    paradoxOperationId: paradoxOp ? paradoxOp.id : null,
    isImmediatelyDeducible,
  };
};
