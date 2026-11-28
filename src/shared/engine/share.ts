import type { MoveHistoryItem } from './types.ts';

export type GenerateShareTextOptions = {
  epochDay: number;
  puzzleDate: string;
  isWon: boolean;
  movesTaken: number;
  parMoves: number;
  score: number;
  hintsUsed: number;
  currentStreak?: number | undefined;
  subredditName?: string | null | undefined;
  history?: MoveHistoryItem[] | undefined;
  includeReveal?: boolean | undefined;
  paradoxOperationLabel?: string | undefined;
  paradoxDescription?: string | undefined;
};

export const generateMoveTrail = (
  history?: MoveHistoryItem[],
  isWon?: boolean
): string => {
  if (!history || history.length === 0) return '';
  const trail = history
    .map((item) => (item.isDivergent ? '🟪' : '🟦'))
    .join(' ');
  return isWon ? `${trail} 🎯` : trail;
};

export const generateShareText = (opts: GenerateShareTextOptions): string => {
  const {
    epochDay,
    puzzleDate,
    isWon,
    movesTaken,
    parMoves,
    score,
    hintsUsed,
    currentStreak,
    subredditName,
    history,
    includeReveal,
    paradoxOperationLabel,
    paradoxDescription,
  } = opts;

  const header = `🧩 Daily Paradox #${epochDay} (${puzzleDate})`;
  const statusLine = isWon
    ? `🎯 Solved in ${movesTaken} moves (Par: ${parMoves})`
    : `✕ Out of moves (${movesTaken} moves, Par: ${parMoves})`;

  const streakStr =
    typeof currentStreak === 'number' && currentStreak > 0
      ? ` • 🔥 Streak: ${currentStreak} days`
      : '';
  const scoreLine = isWon ? `🏆 Score: ${score} pts${streakStr}` : '';
  const hintLine = `Hints: ${hintsUsed}/3 💡`;

  const trail = generateMoveTrail(history, isWon);
  const trailLine = trail ? `Trail: ${trail}` : '';

  const communityLine = subredditName
    ? `Play today's puzzle in r/${subredditName}!`
    : "Play today's puzzle on Reddit!";

  const lines = [header, statusLine];
  if (scoreLine) lines.push(scoreLine);
  lines.push(hintLine);
  if (trailLine) lines.push(trailLine);
  lines.push(communityLine);

  if (includeReveal && paradoxOperationLabel && paradoxDescription) {
    lines.push(
      `Spoiler: >!Secret Rule: [${paradoxOperationLabel}] ${paradoxDescription}!<`
    );
  }

  return lines.filter(Boolean).join('\n');
};
