import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { getDailyPuzzle } from '../shared/engine/index.ts';

export const Splash = () => {
  const activePuzzle = useMemo(() => getDailyPuzzle(), []);

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen p-4 bg-[#0a0e17] text-slate-100">
      <main className="w-full max-w-sm flex flex-col items-center gap-5 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl text-center">
        {/* Header Badge */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 motion-safe:animate-pulse" />
          <h1 className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Daily Paradox
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed">
          One math operation is secretly broken. Spot the paradox to reach the target!
        </p>

        {/* Daily Mission Teaser */}
        <div
          role="region"
          aria-label="Today's goal"
          className="w-full grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono"
        >
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Start
            </span>
            <span className="text-xl font-bold text-slate-200">
              {activePuzzle.startValue}
            </span>
          </div>
          <div className="flex flex-col items-center border-l border-slate-800">
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider">
              Target
            </span>
            <span className="text-xl font-bold text-cyan-300">
              {activePuzzle.targetValue}
            </span>
          </div>
        </div>

        {/* Play Action */}
        <button
          type="button"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          className="w-full min-h-[48px] py-3 px-5 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-lg shadow-violet-900/40 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
        >
          Play Today&apos;s Paradox
        </button>

        <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 font-mono">
          <span>{activePuzzle.date} • Free daily logic challenge</span>
          <span>New puzzle every day at 00:00 UTC</span>
        </div>
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
