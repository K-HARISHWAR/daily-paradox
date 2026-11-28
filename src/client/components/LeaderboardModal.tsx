import type { LeaderboardEntry } from '../../shared/engine/leaderboard.ts';

export type LeaderboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  totalPlayers: number;
  userRank: number | null;
  puzzleDate: string;
  currentUserId?: string | undefined;
  isLoading?: boolean | undefined;
};

export const LeaderboardModal = ({
  isOpen,
  onClose,
  entries,
  totalPlayers,
  userRank,
  puzzleDate,
  currentUserId,
  isLoading,
}: LeaderboardModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <h2
                id="leaderboard-title"
                className="text-base font-black uppercase tracking-wider text-white"
              >
                Daily Leaderboard
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                {puzzleDate} • Top Community Solvers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current user rank banner */}
        {userRank !== null ? (
          <div className="w-full py-2 px-3 rounded-xl bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">Your Daily Standing:</span>
            <span className="font-bold text-cyan-300">
              Rank #{userRank} of {totalPlayers}
            </span>
          </div>
        ) : null}

        {/* Entries list or empty state */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading leaderboard...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4 gap-2 text-slate-400">
              <span className="text-3xl">🎯</span>
              <p className="text-sm font-bold text-slate-200">
                No solvers yet for today!
              </p>
              <p className="text-xs text-slate-500 max-w-xs">
                Be the first to crack today&apos;s broken button and hit the target to claim the #1 spot!
              </p>
            </div>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser =
                currentUserId && entry.userId === currentUserId;

              return (
                <div
                  key={`${entry.userId}-${entry.completedAt}`}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition-all ${
                    isCurrentUser
                      ? 'bg-cyan-950/40 border-cyan-600/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : rank === 1
                        ? 'bg-amber-950/30 border-amber-600/40'
                        : rank === 2
                          ? 'bg-slate-800/40 border-slate-600/40'
                          : rank === 3
                            ? 'bg-orange-950/30 border-orange-700/40'
                            : 'bg-slate-950/50 border-slate-800/80'
                  }`}
                >
                  {/* Left: Rank & Username */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : rank === 3
                              ? 'bg-orange-400 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>

                    <div className="flex flex-col">
                      <span
                        className={`font-sans font-bold text-xs truncate max-w-[140px] sm:max-w-[180px] ${
                          isCurrentUser ? 'text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        {entry.username}
                        {isCurrentUser ? ' (You)' : ''}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {entry.movesTaken} moves • {entry.hintsUsed} hints
                      </span>
                    </div>
                  </div>

                  {/* Right: Score */}
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-sm text-cyan-300">
                      {entry.score}
                    </span>
                    <span className="text-[10px] text-slate-500">pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-[11px] text-slate-500">
          <span>Ranked by Score &gt; Moves &gt; Time</span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl font-bold text-xs uppercase bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
