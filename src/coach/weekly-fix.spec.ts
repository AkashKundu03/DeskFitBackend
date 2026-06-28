import { fixRemainingWeek, findCollision } from './weekly-fix';
import type { WeeklySession, SessionStatus } from './planner.types';

/** Minimal WeeklySession factory for tests (only fields the logic reads matter). */
function session(
  id: string,
  weekday: string,
  status: SessionStatus = 'planned',
): WeeklySession {
  return {
    id,
    weekday,
    date: '2026-06-29',
    title: `${id} workout`,
    focus: 'strength',
    focusLabel: 'Strength',
    durationMin: 30,
    location: 'home',
    equipment: ['bodyweight'],
    estimatedCalories: 200,
    warmup: [],
    exercises: [],
    coachNote: '',
    status,
  };
}

describe('fixRemainingWeek', () => {
  it('never moves completed sessions and never reactivates skipped', () => {
    const sessions = [
      session('mon', 'Mon', 'completed'),
      session('tue', 'Tue', 'skipped'),
      session('thu', 'Thu', 'planned'),
      session('fri', 'Fri', 'planned'),
    ];
    // Today is Wednesday → only Thu/Fri are future-planned.
    const res = fixRemainingWeek(sessions, { todayWeekday: 'Wed' });

    expect(res.feasible).toBe(true);
    const mon = res.after.find((s) => s.id === 'mon')!;
    const tue = res.after.find((s) => s.id === 'tue')!;
    expect(mon.status).toBe('completed');
    expect(mon.weekday).toBe('Mon'); // untouched
    expect(tue.status).toBe('skipped'); // NOT reactivated
    expect(tue.weekday).toBe('Tue'); // untouched
  });

  it('only moves future planned sessions, never today or past', () => {
    const sessions = [
      session('mon', 'Mon', 'planned'), // past (today is Wed) → must NOT move
      session('wed', 'Wed', 'planned'), // today → must NOT move
      session('fri', 'Fri', 'planned'), // future → movable
    ];
    const res = fixRemainingWeek(sessions, { todayWeekday: 'Wed' });
    expect(res.after.find((s) => s.id === 'mon')!.weekday).toBe('Mon');
    expect(res.after.find((s) => s.id === 'wed')!.weekday).toBe('Wed');
    // Only 'fri' is eligible to move; with one slot it may stay on Fri.
    expect(res.changes.every((c) => c.sessionId === 'fri')).toBe(true);
  });

  it('never places two sessions on the same day', () => {
    const sessions = [
      session('thu', 'Thu', 'planned'),
      session('fri', 'Fri', 'planned'),
      session('sat', 'Sat', 'planned'),
    ];
    const res = fixRemainingWeek(sessions, { todayWeekday: 'Wed' });
    const days = res.after.map((s) => s.weekday);
    expect(new Set(days).size).toBe(days.length); // all distinct
  });

  it('respects unavailable days', () => {
    const sessions = [
      session('thu', 'Thu', 'planned'),
      session('fri', 'Fri', 'planned'),
    ];
    const res = fixRemainingWeek(sessions, {
      todayWeekday: 'Wed',
      unavailableDays: ['Thu'],
    });
    expect(res.feasible).toBe(true);
    expect(res.after.every((s) => s.weekday !== 'Thu')).toBe(true);
  });

  it('reports infeasible with a fallback when not enough days remain', () => {
    // Today Fri → only Sat, Sun available, but 3 sessions need moving.
    const sessions = [
      session('a', 'Sat', 'planned'),
      session('b', 'Sun', 'planned'),
      session('c', 'Sun', 'planned'), // forces a collision/overflow
    ];
    // Make them all "future" by setting today before them and unavailable to shrink room.
    const res = fixRemainingWeek(sessions, {
      todayWeekday: 'Fri',
      unavailableDays: ['Sat'],
    });
    expect(res.feasible).toBe(false);
    expect(res.fallback).toBe('chooseMoreDays');
    expect(res.changes).toHaveLength(0);
    // Original sessions untouched when infeasible.
    expect(res.after).toEqual(sessions);
  });

  it('is a no-op when there is nothing future to move', () => {
    const sessions = [
      session('mon', 'Mon', 'completed'),
      session('tue', 'Tue', 'skipped'),
    ];
    const res = fixRemainingWeek(sessions, { todayWeekday: 'Wed' });
    expect(res.feasible).toBe(true);
    expect(res.changes).toHaveLength(0);
    expect(res.after).toBe(sessions);
  });

  it('produces a before/after audit diff', () => {
    const sessions = [
      session('thu', 'Thu', 'planned'),
      session('sat', 'Sat', 'planned'),
    ];
    const res = fixRemainingWeek(sessions, { todayWeekday: 'Wed' });
    expect(res.before).toEqual([
      { sessionId: 'thu', weekday: 'Thu', status: 'planned' },
      { sessionId: 'sat', weekday: 'Sat', status: 'planned' },
    ]);
    expect(res.after).toHaveLength(2);
  });
});

describe('findCollision', () => {
  const sessions = [session('mon', 'Mon'), session('wed', 'Wed')];

  it('detects an occupied target day', () => {
    expect(findCollision(sessions, 'mon', 'Wed')?.id).toBe('wed');
  });

  it('returns null for a free target day', () => {
    expect(findCollision(sessions, 'mon', 'Fri')).toBeNull();
  });

  it('ignores the session being moved', () => {
    expect(findCollision(sessions, 'wed', 'Wed')).toBeNull();
  });
});
