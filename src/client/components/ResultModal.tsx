import { useState } from 'react';
import type { ScoreBreakdown } from '../../shared/engine/types.ts';

export type ResultModalProps = {
  status: 'won' | 'lost';
  score: number | null;
  scoreBreakdown?: ScoreBreakdown | null | undefined;
  movesTaken: number;
  parMoves: number;
  puzzleDate: string;
  currentStreak?: number | undefined;
  subredditName?: string | null | undefined;
  moveTrail?: string | undefined;
  onReset: () => void;
  onShare: (includeReveal: boolean) => void;
  onOpenLeaderboard?: (() => void) | undefined;
  onDiscuss?: (() => void) | undefined;
};

export const ResultModal = ({
  status,
  score,
  scoreBreakdown,
  movesTaken,
  parMoves,
  puzzleDate,
  currentStreak,
  subredditName,
  moveTrail,
  onReset,
  onShare,
  onOpenLeaderboard,
  onDiscuss,
}: ResultModalProps) => {
  const isWon = status === 'won';
  const [includeReveal, setIncludeReveal] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-3.5 text-center max-h-[90vh] overflow-y-auto">
        {/* Status Badge */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border ${
            isWon
              ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              : 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
          }`}
        >
          {isWon ? '✦' : '✕'}
        </div>

        <div>
          <h2
            id="result-title"
            className="text-lg font-black uppercase tracking-wider text-white"
          >
            {isWon ? 'Paradox Solved!' : 'Out of Moves'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isWon
              ? `You mastered the daily challenge for ${puzzleDate}`
              : 'The move limit was reached. Reset to try again!'}
          </p>

          {isWon && typeof currentStreak === 'number' && currentStreak > 0 ? (
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-orange-950/50 border border-orange-700/60 text-orange-300 text-xs font-semibold">
              <span>🔥</span>
              <span>{currentStreak} Day Streak!</span>
            </div>
          ) : null}

          {subredditName ? (
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              r/{subredditName} community challenge
            </p>
          ) : null}
        </div>

        {/* Move Trail */}
        {isWon && moveTrail ? (
          <div className="w-full py-1.5 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-center gap-1.5 font-mono text-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Trail:
            </span>
            <span className="tracking-widest">{moveTrail}</span>
          </div>
        ) : null}

        {isWon && score !== null ? (
          <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5">
              <span>Moves Taken:</span>
              <span className="font-bold text-white">
                {movesTaken} / Par {parMoves}
              </span>
            </div>

            {/* Detailed transparent breakdown */}
            {scoreBreakdown ? (
              <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Base Score:</span>
                  <span className="text-slate-300">+{scoreBreakdown.baseScore}</span>
                </div>
                {scoreBreakdown.parBonus > 0 ? (
                  <div className="flex justify-between text-emerald-400">
                    <span>Par Bonus (≤ {parMoves} moves):</span>
                    <span>+{scoreBreakdown.parBonus}</span>
                  </div>
                ) : null}
                {scoreBreakdown.extraMovePenalty > 0 ? (
                  <div className="flex justify-between text-rose-400">
                    <span>Extra Move Penalty:</span>
                    <span>-{scoreBreakdown.extraMovePenalty}</span>
                  </div>
                ) : null}
                {scoreBreakdown.pureDeductionBonus > 0 ? (
                  <div className="flex justify-between text-violet-300">
                    <span>Pure Deduction Bonus:</span>
                    <span>+{scoreBreakdown.pureDeductionBonus}</span>
                  </div>
                ) : null}
                {scoreBreakdown.hintPenalty > 0 ? (
                  <div className="flex justify-between text-amber-400">
                    <span>Hint Penalty:</span>
                    <span>-{scoreBreakdown.hintPenalty}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800 pt-1.5 font-sans font-bold">
              <span>Final Score:</span>
              <span className="text-base font-extrabold text-cyan-300 font-mono">
                {score} pts
              </span>
            </div>
          </div>
        ) : null}

        {/* Optional Paradox Reveal Toggle */}
        {isWon ? (
          <label className="flex items-center justify-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeReveal}
              onChange={(e) => setIncludeReveal(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
            />
            <span>Include Paradox Reveal in Share (Spoiler Tagged)</span>
          </label>
        ) : null}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 pt-1">
          {isWon ? (
            <button
              type="button"
              onClick={() => onShare(includeReveal)}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-lg shadow-violet-900/30 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
            >
              Share Result Card
            </button>
          ) : null}

          {onOpenLeaderboard ? (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🏆</span>
              <span>View Daily Leaderboard</span>
            </button>
          ) : null}

          {onDiscuss ? (
            <button
              type="button"
              onClick={onDiscuss}
              className="w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>💬</span>
              <span>Discuss on Reddit</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onReset}
            className={`w-full py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${
              isWon
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-900/30'
            }`}
          >
            {isWon ? 'Replay Puzzle' : 'Try Again (Reset)'}
          </button>
        </div>
      </div>
    </div>
  );
};
