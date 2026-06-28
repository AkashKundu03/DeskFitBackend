// Pure helpers for the 7-day scheduled-deletion window.

export const RECOVERY_WINDOW_DAYS = 7;

/** When a scheduled deletion should finalize (now + window). */
export function deletionDate(now: Date, days: number = RECOVERY_WINDOW_DAYS): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

/** True while the account can still be recovered (before the scheduled date). */
export function isWithinRecoveryWindow(scheduledAt: Date, now: Date): boolean {
  return now.getTime() < scheduledAt.getTime();
}
