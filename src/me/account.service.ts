import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { deletionDate } from './account-deletion';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * "Delete account" = wipe ALL of the user's data and sign them out, but keep
   * the minimal account shell. On next sign-in the same account resolves with no
   * data and is treated as a fresh user (questionnaire from scratch). This avoids
   * Apple token revocation entirely while still removing every piece of personal
   * data. Anonymous exit feedback is stored separately (no userId).
   */
  async deleteNow(userId: string, reason?: string) {
    await this.prisma.accountDeletionFeedback.create({
      data: { reason: reason?.slice(0, 500), mode: 'now' },
    });
    await this.purgeUserData(userId);
    this.logger.log('Account data purged (soft delete).');
    return { deleted: true };
  }

  /** Schedule the wipe in 7 days (recoverable until then). */
  async schedule(userId: string, reason?: string) {
    const scheduledAt = deletionDate(new Date());
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionScheduledAt: scheduledAt },
    });
    await this.prisma.accountDeletionFeedback.create({
      data: { reason: reason?.slice(0, 500), mode: 'scheduled' },
    });
    return { scheduledAt };
  }

  async cancel(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionScheduledAt: null },
    });
    return { cancelled: true };
  }

  async status(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletionScheduledAt: true },
    });
    return { deletionScheduledAt: u?.deletionScheduledAt ?? null };
  }

  /**
   * Finalizer for scheduled deletions — purge data for any account whose 7-day
   * window has elapsed. Call this from a cron/worker (see scripts/purge-scheduled).
   */
  async runScheduledPurges(now: Date = new Date()) {
    const due = await this.prisma.user.findMany({
      where: { deletionScheduledAt: { not: null, lte: now } },
      select: { id: true },
    });
    for (const u of due) await this.purgeUserData(u.id);
    return { purged: due.length };
  }

  /** Remove every piece of the user's data; keep the account shell. */
  private async purgeUserData(userId: string) {
    await this.prisma.$transaction([
      this.prisma.userProfile.deleteMany({ where: { userId } }),
      this.prisma.gutAnswers.deleteMany({ where: { userId } }),
      this.prisma.healthReport.deleteMany({ where: { userId } }),
      this.prisma.workoutPlan.deleteMany({ where: { userId } }), // cascades sessions
      this.prisma.workoutSession.deleteMany({ where: { userId } }),
      this.prisma.mealPlan.deleteMany({ where: { userId } }),
      this.prisma.standaloneWorkout.deleteMany({ where: { userId } }),
      this.prisma.planAuditEvent.deleteMany({ where: { userId } }),
      this.prisma.weeklyMealPlan.deleteMany({ where: { userId } }), // cascades days/meals/portions
      this.prisma.mealRegenerationEvent.deleteMany({ where: { userId } }),
      this.prisma.healthDailySummary.deleteMany({ where: { userId } }),
      this.prisma.healthCheckIn.deleteMany({ where: { userId } }),
      this.prisma.appEvent.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { appleRefreshToken: null, deletionScheduledAt: null },
      }),
    ]);
  }
}
