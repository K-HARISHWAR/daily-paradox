import type { HintTier, ScoreBreakdown } from './types.ts';

export const BASE_SCORE = 1000;
export const PAR_BONUS = 200;
export const EXTRA_MOVE_PENALTY = 50;
export const PURE_DEDUCTION_BONUS = 150;
export const MINIMUM_SCORE = 100;

export const HINT_PENALTIES: Record<HintTier, number> = {
  1: 100,
  2: 250,
  3: 500,
};

export const calculateScore = (
  movesTaken: number,
  parMoves: number,
  unlockedHintTier: 0 | 1 | 2 | 3,
  paradoxDeduced: boolean
): ScoreBreakdown => {
  const parBonus = movesTaken <= parMoves ? PAR_BONUS : 0;
  const extraMovePenalty =
    movesTaken > parMoves ? (movesTaken - parMoves) * EXTRA_MOVE_PENALTY : 0;

  const pureDeductionBonus =
    paradoxDeduced && unlockedHintTier <= 1 ? PURE_DEDUCTION_BONUS : 0;

  let hintPenalty = 0;
  if (unlockedHintTier === 1) {
    hintPenalty = HINT_PENALTIES[1];
  } else if (unlockedHintTier === 2) {
    hintPenalty = HINT_PENALTIES[2];
  } else if (unlockedHintTier === 3) {
    hintPenalty = HINT_PENALTIES[3];
  }

  const rawScore =
    BASE_SCORE + parBonus - extraMovePenalty + pureDeductionBonus - hintPenalty;

  const totalScore = Math.max(MINIMUM_SCORE, rawScore);

  return {
    baseScore: BASE_SCORE,
    parBonus,
    extraMovePenalty,
    pureDeductionBonus,
    hintPenalty,
    totalScore,
  };
};
