import { useEffect } from 'react';
import type { Hint, HintTier } from '../../shared/engine/types.ts';
import { HINT_PENALTIES } from '../../shared/engine/scoring.ts';

export type HintModalProps = {
  isOpen: boolean;
  onClose: () => void;
  hints: [Hint, Hint, Hint];
  unlockedHintTier: 0 | 1 | 2 | 3;
  onUnlockNext: (nextTier: HintTier) => void;
};

export const HintModal = ({
  isOpen,
  onClose,
  hints,
  unlockedHintTier,
  onUnlockNext,
}: HintModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let nextTier: HintTier = 1;
  if (unlockedHintTier === 1) {
    nextTier = 2;
  } else if (unlockedHintTier === 2) {
    nextTier = 3;
  }

  const canUnlockMore = unlockedHintTier < 3;
  const nextPenalty = canUnlockMore ? HINT_PENALTIES[nextTier] : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hints-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-mono text-base">💡</span>
            <h2 id="hints-title" className="text-base font-bold text-white">
              Puzzle Hints ({unlockedHintTier}/3)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hints"
            className="w-8 h-8 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Hints guide your deduction progressively. Unlocking a hint applies a modest score penalty on completion, but will never prevent you from winning.
        </p>

        {/* 3 Tier List */}
        <div className="flex flex-col gap-2.5">
          {hints.map((hint) => {
            const isUnlocked = unlockedHintTier >= hint.tier;
            return (
              <div
                key={hint.tier}
                className={`p-3 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'bg-amber-950/20 border-amber-500/40 text-slate-200 shadow-sm'
                    : 'bg-slate-800/30 border-slate-800/80 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isUnlocked
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {hint.tier}
                    </span>
                    <span className={isUnlocked ? 'text-amber-300' : 'text-slate-400'}>
                      {hint.title}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    -{hint.penalty} pts
                  </span>
                </div>

                <p className="text-xs leading-relaxed font-sans mt-1">
                  {isUnlocked ? (
                    <span className="text-slate-100">{hint.description}</span>
                  ) : (
                    <span className="italic text-slate-500">
                      Locked.{' '}
                      {hint.tier === 1 && 'Nudges what to observe in your math.'}
                      {hint.tier === 2 && 'Narrows down the suspect operation button.'}
                      {hint.tier === 3 && 'Reveals the exact altered paradox math.'}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {/* Unlock Action Button */}
        <div className="flex flex-col gap-2 pt-1">
          {canUnlockMore ? (
            <button
              type="button"
              onClick={() => onUnlockNext(nextTier)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
            >
              Unlock Tier {nextTier} (-{nextPenalty} pts)
            </button>
          ) : (
            <div className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 text-slate-400 text-xs text-center font-medium">
              All 3 hints unlocked for today&apos;s challenge.
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[40px] py-2 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
