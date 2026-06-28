// ─────────────────────────────────────────────────────────────────────────────
// "Fix my remaining week" — pure, deterministic redistribution of a week's
// remaining workouts. Replaces the old silent "rebalance".
//
// RULES (enforced here, unit-tested):
//   • Never move COMPLETED sessions — they stay exactly where they are.
//   • Never reactivate SKIPPED sessions — skipped stays skipped, untouched.
//   • Only move FUTURE PLANNED sessions (weekday strictly after today).
//   • Never place two sessions on the same day (no collisions with fixed days).
//   • Respect the user's unavailable days.
//   • Prefer rest spacing (spread evenly across remaining days).
//   • If no valid arrangement exists, report infeasible + a concrete fallback.
//
// Returns a before/after diff (the audit) WITHOUT mutating its input, so the UI
// can show a confirmation preview before anything is persisted.
// ─────────────────────────────────────────────────────────────────────────────

import { WEEKDAYS, weekdayIndex, type WeeklySession } from './planner.types';

export interface FixWeekChange {
  sessionId: string;
  title: string;
  from: string; // weekday before
  to: string; // weekday after
}

export type FixWeekFallback = 'shorten' | 'skip' | 'chooseMoreDays';

export interface FixWeekResult {
  /** Snapshot of every session before the fix (the audit "before"). */
  before: { sessionId: string; weekday: string; status: string }[];
  /** Full session list with future-planned ones moved (the audit "after"). */
  after: WeeklySession[];
  /** Only the sessions that actually moved. */
  changes: FixWeekChange[];
  /** True when a valid arrangement was produced (possibly a no-op). */
  feasible: boolean;
  /** When infeasible, the suggested way out. */
  fallback: FixWeekFallback | null;
  reason: string | null;
}

export interface FixWeekOptions {
  /** The user's LOCAL today as a weekday ("Mon"…"Sun"). */
  todayWeekday: string;
  /** Weekdays the user cannot train on. */
  unavailableDays?: string[];
}

const MOVABLE_STATUSES = new Set(['planned', 'rescheduled']);

/** A session is movable only if it's future AND planned/rescheduled. */
function isFuturePlanned(s: WeeklySession, todayIdx: number): boolean {
  return MOVABLE_STATUSES.has(s.status) && weekdayIndex(s.weekday) > todayIdx;
}

export function fixRemainingWeek(
  sessions: WeeklySession[],
  opts: FixWeekOptions,
): FixWeekResult {
  const todayIdx = Math.max(0, weekdayIndex(opts.todayWeekday));
  const unavailable = new Set(opts.unavailableDays ?? []);

  const before = sessions.map((s) => ({
    sessionId: s.id,
    weekday: s.weekday,
    status: s.status,
  }));

  const movable = sessions.filter((s) => isFuturePlanned(s, todayIdx));
  const fixed = sessions.filter((s) => !isFuturePlanned(s, todayIdx));

  // Nothing to move → success no-op (keeps completed/skipped/today untouched).
  if (movable.length === 0) {
    return {
      before,
      after: sessions,
      changes: [],
      feasible: true,
      fallback: null,
      reason: null,
    };
  }

  // Days already taken by sessions we must NOT touch (completed, skipped,
  // today's session, past sessions). We can never double-book those.
  const occupied = new Set(fixed.map((s) => weekdayIndex(s.weekday)));

  // Candidate days: strictly after today, free, and available.
  const candidates: number[] = [];
  for (let i = todayIdx + 1; i < WEEKDAYS.length; i++) {
    if (occupied.has(i)) continue;
    if (unavailable.has(WEEKDAYS[i])) continue;
    candidates.push(i);
  }

  if (candidates.length < movable.length) {
    return {
      before,
      after: sessions,
      changes: [],
      feasible: false,
      fallback: 'chooseMoreDays',
      reason: `Need ${movable.length} open day(s) after today, but only ${candidates.length} available.`,
    };
  }

  const chosen = spreadEven(candidates, movable.length);
  const ordered = [...movable].sort(
    (a, b) => weekdayIndex(a.weekday) - weekdayIndex(b.weekday),
  );
  const moveTo = new Map<string, number>();
  ordered.forEach((s, i) => moveTo.set(s.id, chosen[i]));

  const changes: FixWeekChange[] = [];
  const after = sessions.map((s) => {
    const idx = moveTo.get(s.id);
    if (idx === undefined) return s; // fixed — untouched
    const newWeekday = WEEKDAYS[idx];
    if (newWeekday !== s.weekday) {
      changes.push({ sessionId: s.id, title: s.title, from: s.weekday, to: newWeekday });
    }
    return { ...s, weekday: newWeekday, status: 'rescheduled' as const };
  });

  return { before, after, changes, feasible: true, fallback: null, reason: null };
}

/** Evenly pick `count` distinct entries from `days`, maximizing spacing. */
function spreadEven(days: number[], count: number): number[] {
  if (count <= 0) return [];
  if (count >= days.length) return days.slice(0, count);
  const out: number[] = [];
  const step = days.length / count;
  for (let i = 0; i < count; i++) out.push(days[Math.floor(i * step)]);
  return out;
}

/**
 * Find the session (if any) already occupying `targetWeekday`, excluding the one
 * being moved. Used to block silent collisions on reschedule unless the user
 * explicitly swaps.
 */
export function findCollision(
  sessions: WeeklySession[],
  movingSessionId: string,
  targetWeekday: string,
): WeeklySession | null {
  return (
    sessions.find(
      (s) => s.id !== movingSessionId && s.weekday === targetWeekday,
    ) ?? null
  );
}
