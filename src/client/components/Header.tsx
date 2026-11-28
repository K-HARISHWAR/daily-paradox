export type HeaderProps = {
  puzzleDate: string;
  countdownText?: string | undefined;
  isDevOverride?: boolean | undefined;
  currentStreak?: number | undefined;
  subredditName?: string | null | undefined;
  onOpenHelp: () => void;
  onOpenHints: () => void;
  onOpenLeaderboard?: (() => void) | undefined;
  unlockedHintCount: number;
  onReset: () => void;
  canReset: boolean;
};

export const Header = ({
  puzzleDate,
  countdownText,
  isDevOverride,
  currentStreak,
  subredditName,
  onOpenHelp,
  onOpenHints,
  onOpenLeaderboard,
  unlockedHintCount,
  onReset,
  canReset,
}: HeaderProps) => {
  return (
    <header className="w-full flex items-center justify-between py-3 px-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Daily Paradox
          </h1>
          {subredditName ? (
            <span
              title={`Community: r/${subredditName}`}
              className="text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono"
            >
              r/{subredditName}
            </span>
          ) : null}
          {isDevOverride ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
              Dev Mode
            </span>
          ) : null}
          {typeof currentStreak === 'number' && currentStreak > 0 ? (
            <span
              title={`${currentStreak} day streak`}
              className="text-[10px] font-bold uppercase tracking-wider bg-orange-950/60 text-orange-400 border border-orange-700/50 px-1.5 py-0.5 rounded flex items-center gap-1"
            >
              <span>🔥</span>
              <span>{currentStreak}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 tracking-wide">
          <span>{puzzleDate}</span>
          {countdownText ? (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 text-[10px]">{countdownText}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenLeaderboard ? (
          <button
            type="button"
            onClick={onOpenLeaderboard}
            aria-label="Open daily leaderboard"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
          >
            <span>🏆</span>
            <span className="hidden sm:inline">Rankings</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onOpenHints}
          aria-label="Open hints"
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer ${
            unlockedHintCount > 0
              ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span>💡</span>
          <span className="hidden sm:inline">Hints</span>
          <span className="font-mono text-[11px]">({unlockedHintCount}/3)</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={!canReset}
          aria-label="Reset puzzle"
          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="How to play"
          className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
        >
          ?
        </button>
      </div>
    </header>
  );
};
