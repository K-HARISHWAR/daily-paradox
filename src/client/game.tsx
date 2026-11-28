import './index.css';

import {
  StrictMode,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { createRoot } from 'react-dom/client';
import { showToast, showShareSheet, navigateTo } from '@devvit/web/client';
import {
  initGameState,
  applyMove,
  resetRun,
  unlockHint,
  calculateScore,
  sanitizePuzzleForClient,
  getDailyPuzzle,
  getEpochDayIndex,
  getMillisecondsUntilNextUtcReset,
  formatTimeUntilReset,
  generateMoveTrail,
  generateShareText,
} from '../shared/engine/index.ts';
import type { GameState, HintTier, Puzzle, ScoreBreakdown } from '../shared/engine/index.ts';
import type { LeaderboardEntry } from '../shared/engine/leaderboard.ts';
import type { SubmitScoreRequest } from '../shared/api.ts';
import { Header } from './components/Header.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { OperationsGrid } from './components/OperationsGrid.tsx';
import { MoveHistory } from './components/MoveHistory.tsx';
import { HelpModal } from './components/HelpModal.tsx';
import { ResultModal } from './components/ResultModal.tsx';
import { HintModal } from './components/HintModal.tsx';
import { LeaderboardModal } from './components/LeaderboardModal.tsx';

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
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState<string>('');
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [subredditName, setSubredditName] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Anti-corruption lock to prevent double-clicks or rapid inputs from corrupting move state
  const isApplyingMoveRef = useRef(false);

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

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?date=${activePuzzle.date}`);
      if (res.ok) {
        const data: unknown = await res.json();
        if (
          typeof data === 'object' &&
          data !== null &&
          'entries' in data &&
          Array.isArray(data.entries)
        ) {
          const list: LeaderboardEntry[] = [];
          for (const item of data.entries) {
            if (
              typeof item === 'object' &&
              item !== null &&
              typeof item.userId === 'string' &&
              typeof item.username === 'string' &&
              typeof item.score === 'number' &&
              typeof item.movesTaken === 'number' &&
              typeof item.hintsUsed === 'number' &&
              typeof item.completedAt === 'string'
            ) {
              list.push(item);
            }
          }
          setLeaderboardEntries(list);
          if ('totalPlayers' in data && typeof data.totalPlayers === 'number') {
            setTotalPlayers(data.totalPlayers);
          }
          if (
            'userRank' in data &&
            (typeof data.userRank === 'number' || data.userRank === null)
          ) {
            setUserRank(data.userRank);
          }
        }
      }
    } catch {
      // Graceful fallback for offline / mock testing
    } finally {
      setLeaderboardLoading(false);
    }
  }, [activePuzzle.date]);

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
            if (
              'postId' in data &&
              typeof data.postId === 'string' &&
              data.postId.length > 0
            ) {
              setPostId(data.postId);
            }
            if (
              'userId' in data &&
              typeof data.userId === 'string' &&
              data.userId.length > 0
            ) {
              setCurrentUserId(data.userId);
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
          void fetchLeaderboard();
        }
      } catch {
        // Gracefully continue with client score
      }
    },
    [activePuzzle.id, activePuzzle.date, fetchLeaderboard]
  );

  const clientPuzzle = useMemo(
    () => sanitizePuzzleForClient(activePuzzle),
    [activePuzzle]
  );

  const paradoxDetails = useMemo(() => {
    const paradoxOp = activePuzzle.operations.find(
      (op) => op.paradox !== undefined
    );
    if (!paradoxOp || !paradoxOp.paradox) return null;
    let description = '';
    if (paradoxOp.paradox.kind === 'offset') {
      const delta = paradoxOp.paradox.delta;
      description = `actually offset by ${delta > 0 ? `+${delta}` : delta} on each tap`;
    } else if (paradoxOp.paradox.kind === 'invert') {
      description = 'inverted operation polarity';
    } else if (paradoxOp.paradox.kind === 'replace') {
      description = `actually executes ${paradoxOp.paradox.actualType} ${paradoxOp.paradox.actualValue}`;
    }
    return {
      label: paradoxOp.label,
      description,
    };
  }, [activePuzzle.operations]);

  const moveTrail = useMemo(
    () => generateMoveTrail(gameState.history, gameState.status === 'won'),
    [gameState.history, gameState.status]
  );

  const isGameOver =
    gameState.status === 'won' || gameState.status === 'lost';

  const handleApplyOperation = useCallback(
    (operationId: string) => {
      if (isApplyingMoveRef.current || isGameOver) return;
      isApplyingMoveRef.current = true;
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

      // 50ms guard against touch bounce / double-tap race conditions
      setTimeout(() => {
        isApplyingMoveRef.current = false;
      }, 50);
    },
    [gameState, activePuzzle, isGameOver, submitWinCompletion]
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

  // Global keyboard shortcuts for desktop & keyboard accessibility
  const isAnyModalOpen =
    helpOpen || hintModalOpen || leaderboardOpen || isGameOver;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key >= '1' && key <= '4') {
        const index = Number(key) - 1;
        const op = clientPuzzle.operations[index];
        if (op) {
          e.preventDefault();
          handleApplyOperation(op.id);
        }
      } else if (key === 'r') {
        e.preventDefault();
        handleReset();
      } else if (key === 'h') {
        e.preventDefault();
        setHintModalOpen(true);
      } else if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setHelpOpen(true);
      } else if (key === 'l') {
        e.preventDefault();
        setLeaderboardOpen(true);
        void fetchLeaderboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAnyModalOpen,
    clientPuzzle.operations,
    handleApplyOperation,
    handleReset,
    fetchLeaderboard,
  ]);

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

  const handleShare = useCallback(
    async (includeReveal = false) => {
      const isWon = gameState.status === 'won';
      const moves = gameState.movesTaken;
      const score = gameState.score ?? 0;
      const hintsUsed = gameState.unlockedHintTier;
      const epochDay = getEpochDayIndex(activePuzzle.date);

      const shareText = generateShareText({
        epochDay,
        puzzleDate: activePuzzle.date,
        isWon,
        movesTaken: moves,
        parMoves: activePuzzle.parMoves,
        score,
        hintsUsed,
        currentStreak,
        subredditName,
        history: gameState.history,
        includeReveal,
        paradoxOperationLabel: paradoxDetails?.label,
        paradoxDescription: paradoxDetails?.description,
      });

      const shareTitle = `Daily Paradox #${epochDay} (${activePuzzle.date})`;

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
    },
    [
      gameState.status,
      gameState.movesTaken,
      gameState.score,
      gameState.unlockedHintTier,
      gameState.history,
      activePuzzle.date,
      activePuzzle.parMoves,
      currentStreak,
      subredditName,
      paradoxDetails,
    ]
  );

  const handleDiscuss = useCallback(() => {
    const postUrl =
      postId && subredditName
        ? `https://reddit.com/r/${subredditName}/comments/${postId}`
        : `https://reddit.com/r/${subredditName ?? 'daily_paradox_dev'}`;
    navigateTo(postUrl);
  }, [postId, subredditName]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#0a0e17] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      <div className="w-full max-w-lg flex flex-col min-h-screen border-x border-slate-900/60 shadow-2xl">
        <Header
          puzzleDate={activePuzzle.date}
          countdownText={countdownText}
          isDevOverride={isDevOverride}
          currentStreak={currentStreak}
          subredditName={subredditName}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenHints={() => setHintModalOpen(true)}
          onOpenLeaderboard={() => {
            setLeaderboardOpen(true);
            void fetchLeaderboard();
          }}
          unlockedHintCount={gameState.unlockedHintTier}
          onReset={handleReset}
          canReset={gameState.movesTaken > 0 || isGameOver}
        />

        <main className="flex-1 flex flex-col p-3 sm:p-4 gap-4 justify-between">
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
                aria-live="assertive"
                className="w-full py-2.5 px-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center justify-between animate-fade-in shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-bold">⚠️</span>
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  aria-label="Dismiss error"
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center text-rose-400 hover:text-rose-100 font-bold ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded cursor-pointer"
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

          <footer className="w-full text-center py-2.5 text-[11px] text-slate-400 border-t border-slate-900/80 flex flex-col gap-0.5 select-none">
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

      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboardEntries}
        totalPlayers={totalPlayers}
        userRank={userRank}
        puzzleDate={activePuzzle.date}
        currentUserId={currentUserId ?? undefined}
        isLoading={leaderboardLoading}
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
          moveTrail={moveTrail}
          onReset={handleReset}
          onShare={handleShare}
          onOpenLeaderboard={() => {
            setLeaderboardOpen(true);
            void fetchLeaderboard();
          }}
          onDiscuss={handleDiscuss}
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
