export type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm max-h-screen overflow-y-auto"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-200 my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 id="help-title" className="text-base font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400 font-mono">◈</span>
            How to Play Daily Paradox
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        {/* 3 Step Onboarding */}
        <div className="flex flex-col gap-2.5 text-xs leading-relaxed">
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold flex items-center justify-center text-[11px]">
              1
            </span>
            <div>
              <p className="font-semibold text-white">Hit the Target Number</p>
              <p className="text-slate-400">
                Transform the Start number into the exact Target number within the Move Limit.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-violet-950/30 border border-violet-800/40">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-900 border border-violet-500 text-violet-200 font-bold flex items-center justify-center text-[11px]">
              2
            </span>
            <div>
              <p className="font-semibold text-violet-200">Spot the Paradox</p>
              <p className="text-slate-300">
                Exactly <span className="text-violet-300 font-bold">ONE</span> button secretly alters its math (e.g. <span className="font-mono text-cyan-300">[+4]</span> actually adds 6). Observe your move history to deduce the twist!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold flex items-center justify-center text-[11px]">
              3
            </span>
            <div>
              <p className="font-semibold text-white">Reset Free of Penalty</p>
              <p className="text-slate-400">
                Experiment freely to deduce the paradox. Hit Reset anytime to restart your moves with 0 penalty!
              </p>
            </div>
          </div>
        </div>

        {/* Transparent Scoring Formula Breakdown */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono">
          <span className="text-xs font-bold text-cyan-400 font-sans uppercase tracking-wider mb-1">
            Transparent Scoring Formula
          </span>
          <div className="flex justify-between text-slate-300">
            <span>Base Completion:</span>
            <span>+1,000 pts</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>Par Move Bonus (≤ Par):</span>
            <span>+200 pts</span>
          </div>
          <div className="flex justify-between text-rose-400">
            <span>Extra Move Penalty:</span>
            <span>-50 pts / extra move</span>
          </div>
          <div className="flex justify-between text-violet-300">
            <span>Pure Deduction Bonus:</span>
            <span>+150 pts (no Tier 2/3 hints)</span>
          </div>
          <div className="flex justify-between text-amber-400">
            <span>Tiered Hints:</span>
            <span>T1 (-100), T2 (-250), T3 (-500)</span>
          </div>
          <div className="border-t border-slate-800 pt-1 mt-1 text-slate-400 text-[10px] italic font-sans">
            Completing the puzzle always awards a minimum of 100 points.
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-lg shadow-violet-900/30 transition-all cursor-pointer"
        >
          Got It, Let&apos;s Play
        </button>
      </div>
    </div>
  );
};
