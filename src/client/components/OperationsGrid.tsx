import type { ClientOperation } from '../../shared/engine/types.ts';

export type OperationsGridProps = {
  operations: ClientOperation[];
  onSelectOperation: (operationId: string) => void;
  disabled: boolean;
};

export const OperationsGrid = ({
  operations,
  onSelectOperation,
  disabled,
}: OperationsGridProps) => {
  return (
    <section
      role="group"
      aria-label="Available operations"
      className="w-full flex flex-col gap-2"
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Available Operations
        </span>
        <span className="text-[11px] text-slate-500">
          One operation is a Paradox!
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {operations.map((op, index) => {
          const shortcutKey = String(index + 1);

          return (
            <button
              key={op.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectOperation(op.id)}
              aria-label={`Apply operation ${op.label} (Press ${shortcutKey})`}
              aria-keyshortcuts={shortcutKey}
              className="relative group min-h-[64px] flex items-center justify-center rounded-xl font-mono text-xl sm:text-2xl font-bold border transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 bg-slate-800/90 hover:bg-slate-750 text-cyan-200 border-slate-700/80 hover:border-violet-500/70 hover:shadow-[0_0_12px_rgba(139,92,246,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer select-none"
            >
              {/* Desktop keyboard shortcut badge */}
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 hidden sm:inline-block text-[10px] font-mono font-medium text-slate-500 group-hover:text-slate-400 px-1 rounded bg-slate-900/60 border border-slate-800"
              >
                {shortcutKey}
              </span>

              <span className="tracking-wide">{op.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
