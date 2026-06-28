import { deletionDate, isWithinRecoveryWindow, RECOVERY_WINDOW_DAYS } from './account-deletion';

describe('account deletion scheduling', () => {
  const now = new Date('2026-06-28T12:00:00.000Z');

  it('schedules deletion 7 days out', () => {
    const d = deletionDate(now);
    expect(RECOVERY_WINDOW_DAYS).toBe(7);
    expect(d.toISOString()).toBe('2026-07-05T12:00:00.000Z');
  });

  it('is recoverable before the scheduled date, not after', () => {
    const scheduled = deletionDate(now);
    expect(isWithinRecoveryWindow(scheduled, now)).toBe(true);
    expect(isWithinRecoveryWindow(scheduled, new Date('2026-07-04T00:00:00Z'))).toBe(true);
    expect(isWithinRecoveryWindow(scheduled, new Date('2026-07-06T00:00:00Z'))).toBe(false);
  });
});
