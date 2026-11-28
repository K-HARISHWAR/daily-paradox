import type { MoveHistoryItem } from '../../shared/engine/types.ts';

export type MoveHistoryProps = {
  history: MoveHistoryItem[];
};

export const MoveHistory = ({ history }: MoveHistoryProps) => {
  if (history.length === 0) {
    return (
      <section
        role="region"
        aria-label="Move history"
        className="w-full py-4 px-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center select-none"
      >
        <span className="text-xs text-slate-400">
          Tap an operation button to start your calculation.
        </span>
        <span className="text-[11px] text-slate-500 mt-0.5">
          Watch for an operation that outputs unexpected math!
        </span>
      </section>
    );
  }

  const latest = history[history.length - 1];

  return (
    <section
      role="region"
      aria-label="Move history"
      className="w-full flex flex-col gap-2"
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Move Log
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          {history.length} {history.length === 1 ? 'move' : 'moves'}
        </span>
      </div>

      <div
        role="list"
        aria-live="polite"
        className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1"
      >
        {history
          .slice(-4)
          .reverse()
          .map((item) => {
            const isLatest = latest && latest.moveNumber === item.moveNumber;
            return (
              <div
                role="listitem"
                key={item.moveNumber}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                  item.isDivergent
                    ? 'bg-violet-950/40 border-violet-500/60 shadow-[0_0_8px_rgba(139,92,246,0.2)] text-violet-200'
                    : isLatest
                      ? 'bg-slate-800/80 border-slate-700 text-slate-100'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    #{item.moveNumber}
                  </span>
                  <span>
                    {item.beforeValue}{' '}
                    <span className="text-cyan-300 font-bold">
                      [{item.operationLabel}]
                    </span>{' '}
                    ➔ {item.afterValue}
                  </span>
                </div>

                {item.isDivergent ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-800/60 text-violet-200 border border-violet-600/50">
                    Paradox!
                  </span>
                ) : null}
              </div>
            );
          })}
      </div>
    </section>
  );
};
