import { applyOperation } from './operations.ts';
import type { Puzzle } from './types.ts';

export type SolverSolution = {
  path: string[];
  labels: string[];
  values: number[];
  moves: number;
};

export type SolverResult = {
  solvable: boolean;
  minMoves: number;
  shortestSolution: SolverSolution | null;
  totalSolutionsWithinLimit: number;
  statesExplored: number;
  maxMovesChecked: number;
};

type QueueItem = {
  value: number;
  path: string[];
  labels: string[];
  values: number[];
};

const MAX_EXPLORED_STATES = 15000;

export const solvePuzzle = (
  puzzle: Puzzle,
  maxSearchDepth?: number
): SolverResult => {
  const maxMoves = maxSearchDepth !== undefined
    ? Math.min(puzzle.moveLimit, maxSearchDepth)
    : puzzle.moveLimit;

  if (puzzle.startValue === puzzle.targetValue) {
    return {
      solvable: true,
      minMoves: 0,
      shortestSolution: {
        path: [],
        labels: [],
        values: [puzzle.startValue],
        moves: 0,
      },
      totalSolutionsWithinLimit: 1,
      statesExplored: 1,
      maxMovesChecked: maxMoves,
    };
  }

  const queue: QueueItem[] = [
    {
      value: puzzle.startValue,
      path: [],
      labels: [],
      values: [puzzle.startValue],
    },
  ];

  const visited = new Map<number, number>();
  visited.set(puzzle.startValue, 0);

  let shortestSolution: SolverSolution | null = null;
  let totalSolutionsWithinLimit = 0;
  let statesExplored = 0;

  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current) break;

    statesExplored += 1;
    if (statesExplored > MAX_EXPLORED_STATES) {
      break;
    }

    const currentMoves = current.path.length;
    if (currentMoves >= maxMoves) {
      continue;
    }

    for (const op of puzzle.operations) {
      const nextVal = applyOperation(current.value, op);
      if (nextVal === null) continue;

      const nextMoves = currentMoves + 1;
      const nextValues = [...current.values, nextVal];
      const nextPath = [...current.path, op.id];
      const nextLabels = [...current.labels, op.label];

      if (nextVal === puzzle.targetValue) {
        totalSolutionsWithinLimit += 1;
        if (!shortestSolution) {
          shortestSolution = {
            path: nextPath,
            labels: nextLabels,
            values: nextValues,
            moves: nextMoves,
          };
        }
      }

      const prevVisitedMoves = visited.get(nextVal);
      if (prevVisitedMoves === undefined || prevVisitedMoves > nextMoves) {
        visited.set(nextVal, nextMoves);
        queue.push({
          value: nextVal,
          path: nextPath,
          labels: nextLabels,
          values: nextValues,
        });
      }
    }
  }

  return {
    solvable: shortestSolution !== null,
    minMoves: shortestSolution ? shortestSolution.moves : -1,
    shortestSolution,
    totalSolutionsWithinLimit,
    statesExplored,
    maxMovesChecked: maxMoves,
  };
};
