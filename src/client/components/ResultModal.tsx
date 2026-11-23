export type ResultModalProps = {
  status: 'won' | 'lost';
  score: number | null;
  movesTaken: number;
  parMoves: number;
  puzzleDate: string;
  onReset: () => void;
  onShare: () => void;
};

export const ResultModal = ({
  status,
  score,
  movesTaken,
  parMoves,
  puzzleDate,
  onReset,
  onShare,
}: ResultModalProps) => {
  const isWon = status === 'won';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
        {/* Status Badge */}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border ${
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
            className="text-xl font-black uppercase tracking-wider text-white"
          >
            {isWon ? 'Paradox Solved!' : 'Out of Moves'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isWon
              ? `You mastered the daily challenge for ${puzzleDate}`
              : 'The move limit was reached. Reset to try again!'}
          </p>
        </div>

        {isWon && score !== null ? (
          <div className="w-full bg-slate-800/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Moves:</span>
              <span className="font-bold text-white">
                {movesTaken} (Par {parMoves})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Final Score:</span>
              <span className="text-base font-extrabold text-cyan-300">
                {score} pts
              </span>
            </div>
          </div>
        ) : null}

        <div className="w-full flex flex-col gap-2 pt-2">
          {isWon ? (
            <button
              type="button"
              onClick={onShare}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-lg shadow-violet-900/30 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              Share Result
            </button>
          ) : null}

          <button
            type="button"
            onClick={onReset}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
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
