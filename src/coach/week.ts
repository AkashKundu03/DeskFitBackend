// ─────────────────────────────────────────────────────────────────────────────
// Pure, timezone-safe week/date helpers for the weekly planner.
//
// Everything here operates on `yyyy-mm-dd` strings (the user's LOCAL calendar
// date, sent by the client) so the planner never shows "last week's Monday" on
// this Monday due to UTC drift. No `Date` timezone math leaks out — we treat an
// ISO date as a fixed civil date and use UTC only as a stable calendar engine.
//
// Deterministic and dependency-free → fully unit-testable without a database.
// ─────────────────────────────────────────────────────────────────────────────

import { WEEKDAYS, type Weekday } from './planner.types';

/** Parse `yyyy-mm-dd` into civil parts (no timezone involved). */
export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return { y, m, d };
}

/** True when `iso` is a well-formed `yyyy-mm-dd` calendar date. */
export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const { y, m, d } = parseISODate(iso);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Weekday index for an ISO date. Mon=0 … Sun=6. */
export function weekdayIndexOfISO(iso: string): number {
  const { y, m, d } = parseISODate(iso);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun … 6=Sat
  return dow === 0 ? 6 : dow - 1;
}

/** Weekday string ("Mon"…"Sun") for an ISO date. */
export function weekdayOfISO(iso: string): Weekday {
  return WEEKDAYS[weekdayIndexOfISO(iso)];
}

/** Monday (`yyyy-mm-dd`) of the week containing `iso`. */
export function mondayOfISO(iso: string): string {
  const { y, m, d } = parseISODate(iso);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() - weekdayIndexOfISO(iso));
  return base.toISOString().slice(0, 10);
}

/** `yyyy-mm-dd` for `weekday` within the week of `todayISO`. */
export function dateForWeekdayISO(todayISO: string, weekday: string): string {
  const monday = mondayOfISO(todayISO);
  const { y, m, d } = parseISODate(monday);
  const base = new Date(Date.UTC(y, m - 1, d));
  const idx = Math.max(0, WEEKDAYS.indexOf(weekday as Weekday));
  base.setUTCDate(base.getUTCDate() + idx);
  return base.toISOString().slice(0, 10);
}

/**
 * Is the plan's week (identified by any date inside it) the SAME week as
 * `todayISO`? Used to decide whether an active plan is current or expired.
 */
export function isSameWeek(planDateISO: string, todayISO: string): boolean {
  return mondayOfISO(planDateISO) === mondayOfISO(todayISO);
}

/** How many whole weeks `todayISO` is ahead of `planDateISO` (negative if behind). */
export function weeksBetween(planDateISO: string, todayISO: string): number {
  const a = new Date(`${mondayOfISO(planDateISO)}T00:00:00.000Z`).getTime();
  const b = new Date(`${mondayOfISO(todayISO)}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / (7 * 24 * 60 * 60 * 1000));
}

/** Today's LOCAL date as `yyyy-mm-dd`. Server fallback when the client omits it. */
export function serverTodayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
