import { CURATED_PUZZLES } from './catalog.ts';
import type { Puzzle } from './types.ts';

export const UTC_RESET_HOURS = 0;

export const getUtcDateString = (date?: Date): string => {
  const d = date ?? new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseUtcDateString = (dateStr: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const yearStr = match[1];
  const monthStr = match[2];
  const dayStr = match[3];
  if (!yearStr || !monthStr || !dayStr) return null;

  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
};

export const getEpochDayIndex = (dateStr: string): number => {
  const parsed = parseUtcDateString(dateStr);
  if (!parsed) return 0;
  return Math.floor(parsed.getTime() / 86400000);
};

export const getMillisecondsUntilNextUtcReset = (date?: Date): number => {
  const now = date ?? new Date();
  const nextReset = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return Math.max(0, nextReset.getTime() - now.getTime());
};

export const formatTimeUntilReset = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};

export const getDailyPuzzle = (
  dateStr?: string,
  overrideIdOrIndex?: string | number
): Puzzle => {
  // 1. Programmatic/dev override check
  if (overrideIdOrIndex !== undefined) {
    if (typeof overrideIdOrIndex === 'number') {
      const idx = Math.abs(overrideIdOrIndex) % CURATED_PUZZLES.length;
      const found = CURATED_PUZZLES[idx];
      if (found) return found;
    } else if (typeof overrideIdOrIndex === 'string') {
      const foundById = CURATED_PUZZLES.find((p) => p.id === overrideIdOrIndex);
      if (foundById) return foundById;
    }
  }

  // 2. Resolved date
  const targetDate = dateStr && parseUtcDateString(dateStr) !== null
    ? dateStr
    : getUtcDateString();

  // 3. Exact date match from curated catalog
  const exactMatch = CURATED_PUZZLES.find((p) => p.date === targetDate);
  if (exactMatch) {
    return exactMatch;
  }

  // 4. Stable epoch cycle mapping for dates without exact match
  const epochDay = getEpochDayIndex(targetDate);
  const catalogIndex = Math.abs(epochDay) % CURATED_PUZZLES.length;
  const basePuzzle = CURATED_PUZZLES[catalogIndex] ?? CURATED_PUZZLES[0];

  if (!basePuzzle) {
    throw new Error('No puzzles available in catalog');
  }

  return {
    ...basePuzzle,
    id: `puzzle-${targetDate}`,
    date: targetDate,
  };
};
