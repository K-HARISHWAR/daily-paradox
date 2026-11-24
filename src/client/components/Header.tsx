export type HeaderProps = {
  puzzleDate: string;
  onOpenHelp: () => void;
  onOpenHints: () => void;
  unlockedHintCount: number;
  onReset: () => void;
  canReset: boolean;
};

export const Header = ({
  puzzleDate,
  onOpenHelp,
  onOpenHints,
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
        </div>
        <span className="text-[11px] font-mono text-slate-400 tracking-wide">
          {puzzleDate}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenHints}
          aria-label="Open hints"
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
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
          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="How to play instructions"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all font-bold text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          ?
        </button>
      </div>
    </header>
  );
};
