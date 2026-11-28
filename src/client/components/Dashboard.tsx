export type DashboardProps = {
  startValue: number;
  targetValue: number;
  currentValue: number;
  movesRemaining: number;
  moveLimit: number;
  isWon: boolean;
};

export const Dashboard = ({
  startValue,
  targetValue,
  currentValue,
  movesRemaining,
  moveLimit,
  isWon,
}: DashboardProps) => {
  const isNearLimit = movesRemaining <= 1 && !isWon;

  return (
    <section
      role="region"
      aria-label="Current puzzle dashboard"
      className="w-full grid grid-cols-3 gap-2 sm:gap-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/80 shadow-inner"
    >
      {/* Start Value */}
      <div
        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/40 border border-slate-800 select-none"
        aria-label={`Start value: ${startValue}`}
      >
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Start
        </span>
        <span className="text-xl sm:text-2xl font-bold font-mono text-slate-300">
          {startValue}
        </span>
      </div>

      {/* Current Value (Hero) */}
      <div
        className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border transition-all duration-300 select-none ${
          isWon
            ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            : 'bg-slate-800/90 border-violet-500/40 shadow-sm'
        }`}
        aria-live="polite"
        aria-label={`Current value: ${currentValue}`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
          Current
        </span>
        <span
          className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight transition-transform ${
            isWon ? 'text-cyan-300 scale-105' : 'text-white'
          }`}
        >
          {currentValue}
        </span>
      </div>

      {/* Target Value */}
      <div
        className="flex flex-col items-center justify-center p-2 rounded-xl bg-cyan-950/20 border border-cyan-800/40 select-none"
        aria-label={`Target value: ${targetValue}`}
      >
        <span className="text-[11px] font-medium uppercase tracking-wider text-cyan-400">
          Target
        </span>
        <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-200">
          {targetValue}
        </span>
      </div>

      {/* Move progress indicator */}
      <div
        className="col-span-3 flex items-center justify-between px-2 pt-1"
        aria-label={`Moves remaining: ${movesRemaining} of ${moveLimit}`}
      >
        <span className="text-xs text-slate-400">
          Moves Remaining:
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono font-bold text-sm ${
              isNearLimit ? 'text-rose-400 motion-safe:animate-pulse' : 'text-slate-200'
            }`}
          >
            {movesRemaining} / {moveLimit}
          </span>
        </div>
      </div>
    </section>
  );
};
