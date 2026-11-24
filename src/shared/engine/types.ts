export type OperationType = 'add' | 'subtract' | 'multiply' | 'divide';

export type ParadoxOffset = {
  kind: 'offset';
  delta: number;
};

export type ParadoxInvert = {
  kind: 'invert';
};

export type ParadoxReplace = {
  kind: 'replace';
  actualType: OperationType;
  actualValue: number;
};

export type ParadoxBehavior = ParadoxOffset | ParadoxInvert | ParadoxReplace;

export type OperationDefinition = {
  id: string;
  label: string;
  type: OperationType;
  value: number;
  paradox?: ParadoxBehavior;
};

export type ClientOperation = {
  id: string;
  label: string;
  type: OperationType;
  value: number;
};

export type HintTier = 1 | 2 | 3;

export type Hint = {
  tier: HintTier;
  title: string;
  description: string;
  penalty: number;
};

export type Puzzle = {
  id: string;
  date: string;
  startValue: number;
  targetValue: number;
  moveLimit: number;
  parMoves: number;
  operations: OperationDefinition[];
  hints: [Hint, Hint, Hint];
};

export type MoveHistoryItem = {
  moveNumber: number;
  operationId: string;
  operationLabel: string;
  beforeValue: number;
  afterValue: number;
  nominalExpectedValue: number;
  isDivergent: boolean;
};

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export type GameState = {
  puzzleId: string;
  date: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  moveLimit: number;
  movesRemaining: number;
  movesTaken: number;
  status: GameStatus;
  history: MoveHistoryItem[];
  unlockedHintTier: 0 | 1 | 2 | 3;
  score: number | null;
  paradoxDeduced: boolean;
};

export type ApplyMoveResult = {
  success: boolean;
  state: GameState;
  error?: string;
};

export type ScoreBreakdown = {
  baseScore: number;
  parBonus: number;
  extraMovePenalty: number;
  pureDeductionBonus: number;
  hintPenalty: number;
  totalScore: number;
};

export type SanitizedPuzzle = Omit<Puzzle, 'operations'> & {
  operations: ClientOperation[];
};

export type PlayerDailyRecord = {
  puzzleId: string;
  puzzleDate: string;
  completed: boolean;
  movesTaken: number;
  score: number;
  hintsUsed: number;
  completedAt: string;
  moveSequence: string[];
};

export type PlayerProgress = {
  userId: string;
  username: string;
  currentStreak: number;
  maxStreak: number;
  totalCompleted: number;
  lastCompletedDate: string | null;
  todayRecord: PlayerDailyRecord | null;
};
