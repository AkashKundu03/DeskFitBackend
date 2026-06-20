import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { WorkoutPlan, WorkoutSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyPlannerService } from '../coach/weekly-planner.service';
import {
  isoDate,
  mondayOf,
  weekdayIndex,
  dateForWeekday,
  type SessionStatus,
  type WeeklySession,
  type WeeklyWorkoutPlan,
} from '../coach/planner.types';
import type { Level } from '../coach/coach.types';
import { CreateWeeklyPlanDto } from './dto/create-weekly-plan.dto';

@Injectable()
export class WorkoutPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planner: WeeklyPlannerService,
  ) {}

  /**
   * Generate a distinct day-wise plan and persist it. Any previous active plan
   * is archived (active=false) so the user always has exactly one current week.
   */
  async createWeeklyPlan(
    userId: string,
    dto: CreateWeeklyPlanDto,
  ): Promise<WeeklyWorkoutPlan> {
    const now = new Date();
    const monday = mondayOf(now);
    const sessions = this.planner.build(
      {
        selectedDays: dto.selectedDays,
        location: dto.location,
        durationMin: dto.durationMin,
        equipment: dto.equipment,
        level: dto.level,
        goal: dto.goal,
      },
      now,
    );

    const plan = await this.prisma.$transaction(async (tx) => {
      await tx.workoutPlan.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
      return tx.workoutPlan.create({
        data: {
          userId,
          weekStartDate: monday,
          selectedDays: dto.selectedDays as Prisma.InputJsonValue,
          goal: dto.goal,
          level: dto.level,
          location: dto.location,
          active: true,
          sessions: {
            create: sessions.map((s) => this.toSessionCreate(userId, s)),
          },
        },
        include: { sessions: true },
      });
    });

    return this.toPlan(plan, plan.sessions);
  }

  async getCurrent(userId: string): Promise<WeeklyWorkoutPlan | null> {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
      include: { sessions: true },
    });
    return plan ? this.toPlan(plan, plan.sessions) : null;
  }

  async completeSession(userId: string, sessionId: string) {
    return this.setStatus(userId, sessionId, 'completed');
  }

  async skipSession(userId: string, sessionId: string) {
    return this.setStatus(userId, sessionId, 'skipped');
  }

  /** Move a session to another weekday in the same week (e.g. Fri → Sun). */
  async rescheduleSession(
    userId: string,
    sessionId: string,
    toWeekday: string,
  ): Promise<WeeklyWorkoutPlan> {
    const session = await this.ownedSession(userId, sessionId);
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { id: session.planId, userId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const monday = mondayOf(new Date(plan.weekStartDate));
    await this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        weekday: toWeekday,
        date: new Date(`${dateForWeekday(monday, toWeekday)}T00:00:00.000Z`),
        status: 'planned',
      },
    });

    // Keep selectedDays in sync so the calendar reflects the move.
    const selected = new Set(this.asStringArray(plan.selectedDays));
    selected.delete(session.weekday);
    selected.add(toWeekday);
    await this.prisma.workoutPlan.update({
      where: { id: plan.id },
      data: { selectedDays: Array.from(selected) as Prisma.InputJsonValue },
    });

    return (await this.getCurrent(userId))!;
  }

  /** Replace a session with a shorter, same-focus version ("make today lighter"). */
  async shorterSession(
    userId: string,
    sessionId: string,
    level: Level = 'beginner',
  ): Promise<WeeklyWorkoutPlan> {
    const row = await this.ownedSession(userId, sessionId);
    const current = this.toSession(row);
    const shorter = this.planner.shorter(current, level);
    await this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        title: shorter.title,
        durationMin: shorter.durationMin,
        estimatedCalories: shorter.estimatedCalories,
        warmup: shorter.warmup as unknown as Prisma.InputJsonValue,
        exercises: shorter.exercises as unknown as Prisma.InputJsonValue,
        coachNote: shorter.coachNote,
        status: 'planned',
      },
    });
    return (await this.getCurrent(userId))!;
  }

  /** Redistribute non-completed sessions across the remaining days of the week. */
  async rebalanceWeek(userId: string): Promise<WeeklyWorkoutPlan> {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
      include: { sessions: true },
    });
    if (!plan) throw new NotFoundException('No active plan to rebalance');

    const sessions = plan.sessions.map((s) => this.toSession(s));
    const rebalanced = this.planner.rebalance(sessions, new Date());
    const monday = mondayOf(new Date(plan.weekStartDate));

    await this.prisma.$transaction(
      rebalanced.map((s) =>
        this.prisma.workoutSession.update({
          where: { id: s.id },
          data: {
            weekday: s.weekday,
            date: new Date(`${dateForWeekday(monday, s.weekday)}T00:00:00.000Z`),
            status: s.status,
          },
        }),
      ),
    );

    const selected = Array.from(new Set(rebalanced.map((s) => s.weekday)));
    await this.prisma.workoutPlan.update({
      where: { id: plan.id },
      data: { selectedDays: selected as Prisma.InputJsonValue },
    });

    return (await this.getCurrent(userId))!;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async setStatus(
    userId: string,
    sessionId: string,
    status: SessionStatus,
  ): Promise<WeeklyWorkoutPlan> {
    await this.ownedSession(userId, sessionId);
    await this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: { status },
    });
    return (await this.getCurrent(userId))!;
  }

  private async ownedSession(userId: string, sessionId: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  private toSessionCreate(
    userId: string,
    s: WeeklySession,
  ): Prisma.WorkoutSessionCreateWithoutPlanInput {
    return {
      user: { connect: { id: userId } },
      weekday: s.weekday,
      date: new Date(`${s.date}T00:00:00.000Z`),
      title: s.title,
      focus: s.focus,
      focusLabel: s.focusLabel,
      durationMin: s.durationMin,
      location: s.location,
      equipment: s.equipment as unknown as Prisma.InputJsonValue,
      estimatedCalories: s.estimatedCalories,
      warmup: s.warmup as unknown as Prisma.InputJsonValue,
      exercises: s.exercises as unknown as Prisma.InputJsonValue,
      coachNote: s.coachNote,
      status: s.status,
    };
  }

  private toSession(row: WorkoutSession): WeeklySession {
    return {
      id: row.id,
      weekday: row.weekday,
      date: isoDate(new Date(row.date)),
      title: row.title,
      focus: row.focus as WeeklySession['focus'],
      focusLabel: row.focusLabel,
      durationMin: row.durationMin,
      location: row.location as WeeklySession['location'],
      equipment: row.equipment as unknown as WeeklySession['equipment'],
      estimatedCalories: row.estimatedCalories,
      warmup: row.warmup as unknown as WeeklySession['warmup'],
      exercises: row.exercises as unknown as WeeklySession['exercises'],
      coachNote: row.coachNote,
      status: row.status as SessionStatus,
    };
  }

  private toPlan(
    plan: WorkoutPlan,
    rows: WorkoutSession[],
  ): WeeklyWorkoutPlan {
    const sessions = rows
      .map((r) => this.toSession(r))
      .sort((a, b) => weekdayIndex(a.weekday) - weekdayIndex(b.weekday));
    return {
      id: plan.id,
      weekStartDate: isoDate(new Date(plan.weekStartDate)),
      selectedDays: this.asStringArray(plan.selectedDays),
      goal: plan.goal,
      level: plan.level,
      location: plan.location,
      sessions,
      completedCount: sessions.filter((s) => s.status === 'completed').length,
      plannedCount: sessions.filter(
        (s) => s.status === 'planned' || s.status === 'rescheduled',
      ).length,
      skippedCount: sessions.filter((s) => s.status === 'skipped').length,
    };
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  }
}
