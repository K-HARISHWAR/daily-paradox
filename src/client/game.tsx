import './index.css';

import { StrictMode, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { showToast } from '@devvit/web/client';
import {
  initGameState,
  applyMove,
  resetRun,
  CURATED_PUZZLES,
  sanitizePuzzleForClient,
} from '../shared/engine/index.ts';
import type { GameState, Puzzle } from '../shared/engine/index.ts';
import { Header } from './components/Header.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { OperationsGrid } from './components/OperationsGrid.tsx';
import { MoveHistory } from './components/MoveHistory.tsx';
import { HelpModal } from './components/HelpModal.tsx';
import { ResultModal } from './components/ResultModal.tsx';

const FALLBACK_PUZZLE: Puzzle = {
  id: 'fallback-01',
  date: '2026-11-23',
  startValue: 3,
  targetValue: 23,
  moveLimit: 5,
  parMoves: 3,
  operations: [],
  hints: [
    { tier: 1, title: 'Nudge', description: 'Observe', penalty: 100 },
    { tier: 2, title: 'Suspect', description: 'Suspect', penalty: 250 },
    { tier: 3, title: 'Reveal', description: 'Reveal', penalty: 500 },
  ],
};

export const App = () => {
  // Use first curated puzzle for MVP interface (Phase 6 hooks up daily resolver)
  const activePuzzle: Puzzle = CURATED_PUZZLES[0] ?? FALLBACK_PUZZLE;

  const [gameState, setGameState] = useState<GameState>(() =>
    initGameState(activePuzzle)
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientPuzzle = useMemo(
    () => sanitizePuzzleForClient(activePuzzle),
    [activePuzzle]
  );

  const handleApplyOperation = useCallback(
    (operationId: string) => {
      setErrorMessage(null);
      const res = applyMove(gameState, activePuzzle, operationId);
      if (res.success) {
        setGameState(res.state);
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    },
    [gameState, activePuzzle]
  );

  const handleReset = useCallback(() => {
    setErrorMessage(null);
    setGameState((prev) => resetRun(prev, activePuzzle));
  }, [activePuzzle]);

  const handleShare = useCallback(() => {
    const isWon = gameState.status === 'won';
    const moves = gameState.movesTaken;
    const score = gameState.score ?? 0;

    const shareText = `DAILY PARADOX [${activePuzzle.date}]
${isWon ? '🎯 Solved in' : '✕ Out of moves:'} ${moves} moves (Par: ${activePuzzle.parMoves})
Score: ${score} pts
Can you deduce the broken button?`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          showToast('Result copied to clipboard!');
        })
        .catch(() => {
          showToast('Failed to copy result.');
        });
    } else {
      showToast('Clipboard not available.');
    }
  }, [gameState, activePuzzle]);

  const isGameOver =
    gameState.status === 'won' || gameState.status === 'lost';

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#0a0e17] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="w-full max-w-lg flex flex-col min-h-screen border-x border-slate-900/60 shadow-2xl">
        <Header
          puzzleDate={activePuzzle.date}
          onOpenHelp={() => setHelpOpen(true)}
          onReset={handleReset}
          canReset={gameState.movesTaken > 0 || isGameOver}
        />

        <main className="flex-1 flex flex-col p-4 gap-4 justify-between">
          <div className="flex flex-col gap-4">
            {/* Dashboard displaying start, current, target, and moves remaining */}
            <Dashboard
              startValue={gameState.startValue}
              targetValue={gameState.targetValue}
              currentValue={gameState.currentValue}
              movesRemaining={gameState.movesRemaining}
              moveLimit={gameState.moveLimit}
              isWon={gameState.status === 'won'}
            />

            {/* Error banner if move failed */}
            {errorMessage ? (
              <div
                role="alert"
                className="w-full py-2 px-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between animate-fade-in"
              >
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-200 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Operations grid */}
            <OperationsGrid
              operations={clientPuzzle.operations}
              onSelectOperation={handleApplyOperation}
              disabled={isGameOver}
            />

            {/* Move history */}
            <MoveHistory history={gameState.history} />
          </div>

          <footer className="w-full text-center py-2 text-[11px] text-slate-500 border-t border-slate-900/80">
            <span>Daily Paradox • Reddit Interactive Game</span>
          </footer>
        </main>
      </div>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {isGameOver ? (
        <ResultModal
          status={gameState.status === 'won' ? 'won' : 'lost'}
          score={gameState.score}
          movesTaken={gameState.movesTaken}
          parMoves={activePuzzle.parMoves}
          puzzleDate={activePuzzle.date}
          onReset={handleReset}
          onShare={handleShare}
        />
      ) : null}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
