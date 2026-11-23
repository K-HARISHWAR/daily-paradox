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
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Available Operations
        </span>
        <span className="text-[11px] text-slate-500">
          One operation is a Paradox!
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {operations.map((op) => {
          return (
            <button
              key={op.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectOperation(op.id)}
              aria-label={`Apply operation ${op.label}`}
              className="relative group min-h-[58px] sm:min-h-[64px] flex items-center justify-center rounded-xl font-mono text-xl sm:text-2xl font-bold border transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 bg-slate-800/90 hover:bg-slate-750 text-cyan-200 border-slate-700/80 hover:border-violet-500/70 hover:shadow-[0_0_12px_rgba(139,92,246,0.25)] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
            >
              <span className="tracking-wide">{op.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
