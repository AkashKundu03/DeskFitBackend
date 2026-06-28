import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HealthDailyDto } from './dto/health-daily.dto';
import { HealthCheckInDto } from './dto/health-checkin.dto';
import { computeInsight, type DayMetrics } from './health-insight';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  private isoDay(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Upsert a subjective daily check-in. */
  upsertCheckIn(userId: string, dto: HealthCheckInDto) {
    const date = new Date(`${dto.date}T00:00:00.000Z`);
    const data = {
      energy: dto.energy,
      soreness: dto.soreness,
      mood: dto.mood,
      stress: dto.stress,
    };
    return this.prisma.healthCheckIn.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: data,
    });
  }

  /** Deterministic recovery-signal insight from the user's own baseline. */
  async getInsight(userId: string, todayISO: string) {
    const today = new Date(`${todayISO}T00:00:00.000Z`);
    const summaries = await this.prisma.healthDailySummary.findMany({
      where: { userId, date: { lte: today } },
      orderBy: { date: 'desc' },
      take: 29,
    });
    const checkIn = await this.prisma.healthCheckIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    const toMetrics = (s: (typeof summaries)[number]): DayMetrics => ({
      date: this.isoDay(s.date),
      restingHR: s.restingHR,
      hrv: s.hrv,
      sleepMinutes: s.sleepMinutes,
      steps: s.steps,
      activeEnergyKcal: s.activeEnergyKcal,
    });

    const todaySummary = summaries.find((s) => this.isoDay(s.date) === todayISO);
    const history = summaries
      .filter((s) => this.isoDay(s.date) !== todayISO)
      .map(toMetrics);

    return computeInsight(
      history,
      todaySummary ? toMetrics(todaySummary) : null,
      checkIn
        ? { energy: checkIn.energy, soreness: checkIn.soreness, mood: checkIn.mood, stress: checkIn.stress }
        : null,
    );
  }

  /** Upsert one day's aggregate (idempotent on (userId, date)). */
  upsertDaily(userId: string, dto: HealthDailyDto) {
    const date = new Date(`${dto.date}T00:00:00.000Z`);
    const data = {
      timezone: dto.timezone,
      steps: dto.steps,
      activeEnergyKcal: dto.activeEnergyKcal,
      exerciseMinutes: dto.exerciseMinutes,
      sleepMinutes: dto.sleepMinutes,
      restingHR: dto.restingHR,
      hrv: dto.hrv,
      workoutCount: dto.workoutCount,
      workoutMinutes: dto.workoutMinutes,
      sourceCoverage: dto.sourceCoverage as Prisma.InputJsonValue | undefined,
      sampleTimestamps: dto.sampleTimestamps as Prisma.InputJsonValue | undefined,
    };
    return this.prisma.healthDailySummary.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: data,
    });
  }

  /** Upsert many days in one transaction (backfill). */
  async upsertMany(userId: string, days: HealthDailyDto[]) {
    await this.prisma.$transaction(days.map((d) => {
      const date = new Date(`${d.date}T00:00:00.000Z`);
      const data = {
        timezone: d.timezone,
        steps: d.steps,
        activeEnergyKcal: d.activeEnergyKcal,
        exerciseMinutes: d.exerciseMinutes,
        sleepMinutes: d.sleepMinutes,
        restingHR: d.restingHR,
        hrv: d.hrv,
        workoutCount: d.workoutCount,
        workoutMinutes: d.workoutMinutes,
        sourceCoverage: d.sourceCoverage as Prisma.InputJsonValue | undefined,
        sampleTimestamps: d.sampleTimestamps as Prisma.InputJsonValue | undefined,
      };
      return this.prisma.healthDailySummary.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, ...data },
        update: data,
      });
    }));
    return { count: days.length };
  }

  /** Aggregates in a date range (inclusive), newest first. */
  getRange(userId: string, from?: string, to?: string) {
    const where: Prisma.HealthDailySummaryWhereInput = { userId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.date.lte = new Date(`${to}T00:00:00.000Z`);
    }
    return this.prisma.healthDailySummary.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 120,
    });
  }
}
