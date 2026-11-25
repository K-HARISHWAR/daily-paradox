import './index.css';

import { StrictMode, useState, useCallback, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { showToast, showShareSheet } from '@devvit/web/client';
import {
  initGameState,
  applyMove,
  resetRun,
  unlockHint,
  calculateScore,
  sanitizePuzzleForClient,
  getDailyPuzzle,
  getMillisecondsUntilNextUtcReset,
  formatTimeUntilReset,
} from '../shared/engine/index.ts';
import type { GameState, HintTier, Puzzle, ScoreBreakdown } from '../shared/engine/index.ts';
import type { SubmitScoreRequest } from '../shared/api.ts';
import { Header } from './components/Header.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { OperationsGrid } from './components/OperationsGrid.tsx';
import { MoveHistory } from './components/MoveHistory.tsx';
import { HelpModal } from './components/HelpModal.tsx';
import { ResultModal } from './components/ResultModal.tsx';
import { HintModal } from './components/HintModal.tsx';

const ONBOARDING_KEY = 'daily_paradox_seen_onboarding';

type ResolvedPuzzleInfo = {
  puzzle: Puzzle;
  isDevOverride: boolean;
};

const resolvePuzzle = (): ResolvedPuzzleInfo => {
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    const puzzleParam = params.get('puzzle');
    const dateParam = params.get('date');

    if (puzzleParam) {
      return {
        puzzle: getDailyPuzzle(undefined, puzzleParam),
        isDevOverride: true,
      };
    }
    if (dateParam) {
      return {
        puzzle: getDailyPuzzle(dateParam),
        isDevOverride: true,
      };
    }
  }
  return {
    puzzle: getDailyPuzzle(),
    isDevOverride: false,
  };
};

export const App = () => {
  const { puzzle: activePuzzle, isDevOverride } = useMemo(
    () => resolvePuzzle(),
    []
  );

  const [gameState, setGameState] = useState<GameState>(() =>
    initGameState(activePuzzle)
  );
  const [helpOpen, setHelpOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const seen = window.localStorage.getItem(ONBOARDING_KEY);
        if (!seen) {
          window.localStorage.setItem(ONBOARDING_KEY, 'true');
          return true;
        }
      } catch {
        // Fallback gracefully
      }
    }
    return false;
  });
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState<string>('');
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [subredditName, setSubredditName] = useState<string | null>(null);

  // Live countdown to next 00:00 UTC daily puzzle reset
  useEffect(() => {
    const updateCountdown = () => {
      const ms = getMillisecondsUntilNextUtcReset();
      setCountdownText(`${formatTimeUntilReset(ms)} until next puzzle (UTC)`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial progress from server
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/progress');
        if (res.ok) {
          const data: unknown = await res.json();
          if (typeof data === 'object' && data !== null) {
            if ('currentStreak' in data && typeof data.currentStreak === 'number') {
              setCurrentStreak(data.currentStreak);
            }
            if (
              'subredditName' in data &&
              typeof data.subredditName === 'string' &&
              data.subredditName.length > 0
            ) {
              setSubredditName(data.subredditName);
            }
          }
        }
      } catch {
        // Graceful fallback for offline / mock testing
      }
    };
    void fetchProgress();
  }, []);

  const submitWinCompletion = useCallback(
    async (state: GameState) => {
      try {
        const payload: SubmitScoreRequest = {
          puzzleId: activePuzzle.id,
          puzzleDate: activePuzzle.date,
          moveSequence: state.history.map((h) => h.operationId),
          unlockedHintTier: state.unlockedHintTier,
        };

        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data: unknown = await res.json();
          if (
            typeof data === 'object' &&
            data !== null &&
            'currentStreak' in data &&
            typeof data.currentStreak === 'number'
          ) {
            setCurrentStreak(data.currentStreak);
          }
        }
      } catch {
        // Gracefully continue with client score
      }
    },
    [activePuzzle.id, activePuzzle.date]
  );

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
        if (res.state.status === 'won') {
          void submitWinCompletion(res.state);
        }
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    },
    [gameState, activePuzzle, submitWinCompletion]
  );

  const handleReset = useCallback(() => {
    setErrorMessage(null);
    setGameState((prev) => resetRun(prev, activePuzzle));
  }, [activePuzzle]);

  const handleUnlockHint = useCallback(
    (nextTier: HintTier) => {
      setGameState((prev) => unlockHint(prev, nextTier));
      showToast(`Tier ${nextTier} hint unlocked!`);
    },
    []
  );

  const scoreBreakdown: ScoreBreakdown | null = useMemo(() => {
    if (gameState.status !== 'won') return null;
    return calculateScore(
      gameState.movesTaken,
      activePuzzle.parMoves,
      gameState.unlockedHintTier,
      gameState.paradoxDeduced
    );
  }, [
    gameState.status,
    gameState.movesTaken,
    gameState.unlockedHintTier,
    gameState.paradoxDeduced,
    activePuzzle.parMoves,
  ]);

  const handleShare = useCallback(async () => {
    const isWon = gameState.status === 'won';
    const moves = gameState.movesTaken;
    const score = gameState.score ?? 0;
    const hintsUsed = gameState.unlockedHintTier;
    const streakStr = currentStreak > 0 ? ` • 🔥 Streak: ${currentStreak} days` : '';
    const communityLine = subredditName
      ? `Play today's puzzle in r/${subredditName}!`
      : "Play today's puzzle on Reddit!";

    const shareTitle = `Daily Paradox (${activePuzzle.date})`;
    const shareText = `🧩 Daily Paradox (${activePuzzle.date})
${isWon ? '🎯 Solved in' : '✕ Out of moves:'} ${moves} moves (Par: ${activePuzzle.parMoves})
🏆 Score: ${score} pts${streakStr}
Hints: ${hintsUsed}/3 💡
${communityLine}`;

    // Try native share sheet first (Devvit Web mobile / supported clients)
    try {
      await showShareSheet({
        title: shareTitle,
        text: shareText,
      });
      showToast('Shared successfully!');
      return;
    } catch {
      // Fallback to clipboard if share sheet fails or is unsupported
    }

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
  }, [gameState, activePuzzle, currentStreak, subredditName]);

  const isGameOver =
    gameState.status === 'won' || gameState.status === 'lost';

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#0a0e17] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="w-full max-w-lg flex flex-col min-h-screen border-x border-slate-900/60 shadow-2xl">
        <Header
          puzzleDate={activePuzzle.date}
          countdownText={countdownText}
          isDevOverride={isDevOverride}
          currentStreak={currentStreak}
          subredditName={subredditName}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenHints={() => setHintModalOpen(true)}
          unlockedHintCount={gameState.unlockedHintTier}
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
                  className="text-rose-400 hover:text-rose-200 font-bold ml-2 cursor-pointer"
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

          <footer className="w-full text-center py-2 text-[11px] text-slate-500 border-t border-slate-900/80 flex flex-col gap-0.5">
            <span>Daily Paradox • Resets daily at 00:00 UTC</span>
          </footer>
        </main>
      </div>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <HintModal
        isOpen={hintModalOpen}
        onClose={() => setHintModalOpen(false)}
        hints={activePuzzle.hints}
        unlockedHintTier={gameState.unlockedHintTier}
        onUnlockNext={handleUnlockHint}
      />

      {isGameOver ? (
        <ResultModal
          status={gameState.status === 'won' ? 'won' : 'lost'}
          score={gameState.score}
          scoreBreakdown={scoreBreakdown}
          movesTaken={gameState.movesTaken}
          parMoves={activePuzzle.parMoves}
          puzzleDate={activePuzzle.date}
          currentStreak={currentStreak}
          subredditName={subredditName}
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
