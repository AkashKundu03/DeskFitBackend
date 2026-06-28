import {
  mondayOfISO,
  weekdayOfISO,
  weekdayIndexOfISO,
  dateForWeekdayISO,
  isSameWeek,
  weeksBetween,
  isValidISODate,
} from './week';

describe('week helpers (timezone-safe, ISO-date based)', () => {
  it('maps weekdays correctly (Mon=0 … Sun=6)', () => {
    // 2026-06-29 is a Monday.
    expect(weekdayOfISO('2026-06-29')).toBe('Mon');
    expect(weekdayIndexOfISO('2026-06-29')).toBe(0);
    expect(weekdayOfISO('2026-07-05')).toBe('Sun'); // Sunday
    expect(weekdayIndexOfISO('2026-07-05')).toBe(6);
  });

  it('computes Monday of the week for any day', () => {
    expect(mondayOfISO('2026-06-29')).toBe('2026-06-29'); // Mon → itself
    expect(mondayOfISO('2026-07-01')).toBe('2026-06-29'); // Wed → that Mon
    expect(mondayOfISO('2026-07-05')).toBe('2026-06-29'); // Sun → that Mon
  });

  it('handles month/year boundaries', () => {
    // 2026-01-01 is a Thursday → Monday is 2025-12-29.
    expect(mondayOfISO('2026-01-01')).toBe('2025-12-29');
  });

  it('derives a date for a weekday within today’s week', () => {
    expect(dateForWeekdayISO('2026-07-01', 'Mon')).toBe('2026-06-29');
    expect(dateForWeekdayISO('2026-07-01', 'Wed')).toBe('2026-07-01');
    expect(dateForWeekdayISO('2026-07-01', 'Sun')).toBe('2026-07-05');
  });

  describe('isSameWeek — the core "expire last week" guard', () => {
    it('last Monday is NOT the same week as this Monday', () => {
      // The exact bug: a plan dated last Mon (2026-06-22) must not be current
      // when today is this Mon (2026-06-29).
      expect(isSameWeek('2026-06-22', '2026-06-29')).toBe(false);
    });
    it('any day this week is the same week as today', () => {
      expect(isSameWeek('2026-06-29', '2026-07-03')).toBe(true);
      expect(isSameWeek('2026-07-05', '2026-06-29')).toBe(true);
    });
  });

  it('counts whole weeks between two dates', () => {
    expect(weeksBetween('2026-06-22', '2026-06-29')).toBe(1);
    expect(weeksBetween('2026-06-29', '2026-06-29')).toBe(0);
    expect(weeksBetween('2026-06-08', '2026-06-29')).toBe(3);
  });

  it('validates ISO date strings', () => {
    expect(isValidISODate('2026-06-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('29-06-2026')).toBe(false);
    expect(isValidISODate('garbage')).toBe(false);
  });
});
