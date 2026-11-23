import { applyOperation, applyStandard } from './operations.ts';
import { calculateScore } from './scoring.ts';
import type {
  ApplyMoveResult,
  ClientOperation,
  GameState,
  HintTier,
  MoveHistoryItem,
  Puzzle,
} from './types.ts';

export const initGameState = (puzzle: Puzzle): GameState => {
  return {
    puzzleId: puzzle.id,
    date: puzzle.date,
    startValue: puzzle.startValue,
    targetValue: puzzle.targetValue,
    currentValue: puzzle.startValue,
    moveLimit: puzzle.moveLimit,
    movesRemaining: puzzle.moveLimit,
    movesTaken: 0,
    status: 'idle',
    history: [],
    unlockedHintTier: 0,
    score: null,
    paradoxDeduced: false,
  };
};

export const applyMove = (
  state: GameState,
  puzzle: Puzzle,
  operationId: string
): ApplyMoveResult => {
  if (state.status === 'won') {
    return {
      success: false,
      state,
      error: 'Game is already won. Cannot apply further moves.',
    };
  }

  if (state.status === 'lost') {
    return {
      success: false,
      state,
      error: 'Game is already lost. Reset the puzzle to play again.',
    };
  }

  if (state.movesRemaining <= 0) {
    return {
      success: false,
      state,
      error: 'No moves remaining.',
    };
  }

  const operation = puzzle.operations.find((op) => op.id === operationId);
  if (!operation) {
    return {
      success: false,
      state,
      error: `Operation with id '${operationId}' not found.`,
    };
  }

  const beforeValue = state.currentValue;
  const afterValue = applyOperation(beforeValue, operation);

  if (afterValue === null) {
    return {
      success: false,
      state,
      error: `Operation '${operation.label}' cannot be applied to ${beforeValue}.`,
    };
  }

  const nominalValue = applyStandard(beforeValue, operation.type, operation.value);
  const isDivergent = nominalValue !== afterValue;
  const movesRemaining = state.movesRemaining - 1;
  const movesTaken = state.movesTaken + 1;
  const paradoxDeduced = state.paradoxDeduced || isDivergent;

  const historyItem: MoveHistoryItem = {
    moveNumber: movesTaken,
    operationId: operation.id,
    operationLabel: operation.label,
    beforeValue,
    afterValue,
    nominalExpectedValue: nominalValue ?? beforeValue,
    isDivergent,
  };

  const newHistory = [...state.history, historyItem];

  if (afterValue === puzzle.targetValue) {
    const scoreResult = calculateScore(
      movesTaken,
      puzzle.parMoves,
      state.unlockedHintTier,
      paradoxDeduced
    );

    const wonState: GameState = {
      ...state,
      currentValue: afterValue,
      movesRemaining,
      movesTaken,
      status: 'won',
      history: newHistory,
      paradoxDeduced,
      score: scoreResult.totalScore,
    };

    return {
      success: true,
      state: wonState,
    };
  }

  if (movesRemaining === 0) {
    const lostState: GameState = {
      ...state,
      currentValue: afterValue,
      movesRemaining: 0,
      movesTaken,
      status: 'lost',
      history: newHistory,
      paradoxDeduced,
      score: null,
    };

    return {
      success: true,
      state: lostState,
    };
  }

  const playingState: GameState = {
    ...state,
    currentValue: afterValue,
    movesRemaining,
    movesTaken,
    status: 'playing',
    history: newHistory,
    paradoxDeduced,
    score: null,
  };

  return {
    success: true,
    state: playingState,
  };
};

export const resetRun = (state: GameState, puzzle: Puzzle): GameState => {
  return {
    ...state,
    currentValue: puzzle.startValue,
    movesRemaining: puzzle.moveLimit,
    movesTaken: 0,
    status: 'idle',
    history: [],
    score: null,
  };
};

export const unlockHint = (
  state: GameState,
  tier: HintTier
): GameState => {
  if (tier <= state.unlockedHintTier) {
    return state;
  }
  return {
    ...state,
    unlockedHintTier: tier,
  };
};

export const markParadoxDeduced = (
  state: GameState,
  deduced: boolean
): GameState => {
  return {
    ...state,
    paradoxDeduced: deduced,
  };
};

export type SanitizedPuzzle = Omit<Puzzle, 'operations'> & {
  operations: ClientOperation[];
};

export const sanitizePuzzleForClient = (puzzle: Puzzle): SanitizedPuzzle => {
  const sanitizedOps: ClientOperation[] = puzzle.operations.map((op) => ({
    id: op.id,
    label: op.label,
    type: op.type,
    value: op.value,
  }));

  return {
    id: puzzle.id,
    date: puzzle.date,
    startValue: puzzle.startValue,
    targetValue: puzzle.targetValue,
    moveLimit: puzzle.moveLimit,
    parMoves: puzzle.parMoves,
    operations: sanitizedOps,
    hints: puzzle.hints,
  };
};
