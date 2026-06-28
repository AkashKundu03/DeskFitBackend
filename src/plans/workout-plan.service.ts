import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { WorkoutPlan, WorkoutSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyPlannerService } from '../coach/weekly-planner.service';
import { WorkoutsService } from '../coach/workouts.service';
import {
  isoDate,
  mondayOf,
  weekdayIndex,
  dateForWeekday,
  type SessionStatus,
  type WeeklySession,
  type WeeklyWorkoutPlan,
} from '../coach/planner.types';
import {
  isSameWeek,
  mondayOfISO,
  serverTodayISO,
  weekdayOfISO,
} from '../coach/week';
import { fixRemainingWeek, findCollision } from '../coach/weekly-fix';
import type { FixWeekResult } from '../coach/weekly-fix';
import type { Equipment, Focus, Level, Location } from '../coach/coach.types';
import { CreateWeeklyPlanDto } from './dto/create-weekly-plan.dto';
import { CreateStandaloneWorkoutDto } from './dto/standalone-workout.dto';

@Injectable()
export class WorkoutPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planner: WeeklyPlannerService,
    private readonly workouts: WorkoutsService,
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

  /**
   * The plan for the user's CURRENT week. `todayISO` is the client's LOCAL date
   * (yyyy-mm-dd) so week boundaries match the user's timezone, not the server's.
   *
   * If the active plan belongs to a past week, it is auto-continued: a fresh week
   * with the same structure (selected days / goal / level / location / equipment)
   * is generated for the current week and the old one archived. This is what
   * stops "last week's Monday workout" from showing this Monday.
   */
  async getCurrent(
    userId: string,
    todayISO: string = serverTodayISO(),
  ): Promise<WeeklyWorkoutPlan | null> {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
      include: { sessions: true },
    });
    if (!plan) return null;

    const weekStart = isoDate(new Date(plan.weekStartDate));
    if (isSameWeek(weekStart, todayISO)) {
      return this.toPlan(plan, plan.sessions);
    }
    return this.rollForward(userId, plan, plan.sessions, todayISO);
  }

  /**
   * Auto-continue a stale plan into the current week. The template (selected
   * days, goal, level, location) lives on the plan; per-session details
   * (duration, equipment) are read from a sample session. Deterministic.
   */
  private async rollForward(
    userId: string,
    stale: WorkoutPlan,
    staleSessions: WorkoutSession[],
    todayISO: string,
  ): Promise<WeeklyWorkoutPlan> {
    const selectedDays = this.asStringArray(stale.selectedDays);
    const sample = staleSessions[0];
    if (selectedDays.length === 0 || !sample) {
      // Nothing to regenerate from — just archive the stale plan.
      await this.prisma.workoutPlan.update({
        where: { id: stale.id },
        data: { active: false },
      });
      return this.toPlan({ ...stale, active: false }, []);
    }

    const monday = new Date(`${mondayOfISO(todayISO)}T00:00:00.000Z`);
    const sessions = this.planner.build(
      {
        selectedDays,
        location: (stale.location ?? sample.location) as Location,
        durationMin: sample.durationMin,
        equipment: sample.equipment as unknown as Equipment[],
        level: (stale.level ?? 'beginner') as Level,
        goal: (stale.goal ?? 'maintenance') as
          | 'fatLoss'
          | 'muscleGain'
          | 'maintenance',
      },
      monday,
    );

    const fresh = await this.prisma.$transaction(async (tx) => {
      await tx.workoutPlan.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
      return tx.workoutPlan.create({
        data: {
          userId,
          weekStartDate: monday,
          selectedDays: selectedDays as Prisma.InputJsonValue,
          goal: stale.goal,
          level: stale.level,
          location: stale.location,
          active: true,
          sessions: {
            create: sessions.map((s) => this.toSessionCreate(userId, s)),
          },
        },
        include: { sessions: true },
      });
    });
    return this.toPlan(fresh, fresh.sessions);
  }

  async completeSession(userId: string, sessionId: string) {
    return this.setStatus(userId, sessionId, 'completed');
  }

  async skipSession(userId: string, sessionId: string) {
    return this.setStatus(userId, sessionId, 'skipped');
  }

  /**
   * Move a session to another weekday WITHOUT regenerating its workout. Blocks
   * landing on an already-occupied day unless `swap` is true, in which case the
   * two sessions exchange days. Never silently double-books.
   */
  async rescheduleSession(
    userId: string,
    sessionId: string,
    toWeekday: string,
    swap = false,
  ): Promise<WeeklyWorkoutPlan> {
    const session = await this.ownedSession(userId, sessionId);
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { id: session.planId, userId },
      include: { sessions: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    if (session.weekday === toWeekday) {
      return this.loadPlan(userId, plan.id);
    }

    const sessions = plan.sessions.map((s) => this.toSession(s));
    const collision = findCollision(sessions, sessionId, toWeekday);
    if (collision && !swap) {
      throw new ConflictException(
        `${toWeekday} already has "${collision.title}". Swap them or pick another day.`,
      );
    }

    const monday = mondayOf(new Date(plan.weekStartDate));
    const fromWeekday = session.weekday;
    await this.prisma.$transaction(async (tx) => {
      if (collision && swap) {
        await tx.workoutSession.update({
          where: { id: collision.id },
          data: {
            weekday: fromWeekday,
            date: new Date(`${dateForWeekday(monday, fromWeekday)}T00:00:00.000Z`),
            status: 'rescheduled',
          },
        });
      }
      await tx.workoutSession.update({
        where: { id: sessionId },
        data: {
          weekday: toWeekday,
          date: new Date(`${dateForWeekday(monday, toWeekday)}T00:00:00.000Z`),
          status: 'rescheduled',
        },
      });
    });

    await this.syncSelectedDays(plan.id);
    return this.loadPlan(userId, plan.id);
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
    return this.loadPlan(userId, row.planId);
  }

  /**
   * "Fix my remaining week" PREVIEW — compute the before/after change set without
   * persisting anything, so the UI can show a confirmation. Never moves completed
   * sessions, never reactivates skipped ones, only moves future planned sessions.
   */
  async previewFixWeek(
    userId: string,
    todayISO: string = serverTodayISO(),
    unavailableDays: string[] = [],
  ): Promise<FixWeekResult> {
    const plan = await this.activePlan(userId);
    const sessions = plan.sessions.map((s) => this.toSession(s));
    return fixRemainingWeek(sessions, {
      todayWeekday: weekdayOfISO(todayISO),
      unavailableDays,
    });
  }

  /**
   * "Fix my remaining week" APPLY — persist the previewed arrangement. Returns
   * the updated plan plus the audit (what changed and why). No-op if infeasible.
   */
  async applyFixWeek(
    userId: string,
    todayISO: string = serverTodayISO(),
    unavailableDays: string[] = [],
  ): Promise<{ plan: WeeklyWorkoutPlan; result: FixWeekResult }> {
    const plan = await this.activePlan(userId);
    const sessions = plan.sessions.map((s) => this.toSession(s));
    const result = fixRemainingWeek(sessions, {
      todayWeekday: weekdayOfISO(todayISO),
      unavailableDays,
    });

    if (!result.feasible || result.changes.length === 0) {
      return { plan: this.toPlan(plan, plan.sessions), result };
    }

    const monday = mondayOf(new Date(plan.weekStartDate));
    await this.prisma.$transaction(
      result.changes.map((c) =>
        this.prisma.workoutSession.update({
          where: { id: c.sessionId },
          data: {
            weekday: c.to,
            date: new Date(`${dateForWeekday(monday, c.to)}T00:00:00.000Z`),
            status: 'rescheduled',
          },
        }),
      ),
    );
    await this.syncSelectedDays(plan.id);
    await this.prisma.planAuditEvent.create({
      data: {
        userId,
        planId: plan.id,
        kind: 'fix_week',
        changes: result.changes as unknown as Prisma.InputJsonValue,
        detail: {
          feasible: result.feasible,
          fallback: result.fallback,
          reason: result.reason,
          todayWeekday: weekdayOfISO(todayISO),
        } as Prisma.InputJsonValue,
      },
    });
    return { plan: await this.loadPlan(userId, plan.id), result };
  }

  /** Back-compat: the old "rebalance-week" route now applies the corrected fix. */
  async rebalanceWeek(userId: string): Promise<WeeklyWorkoutPlan> {
    const { plan } = await this.applyFixWeek(userId);
    return plan;
  }

  /**
   * Regenerate ONE day's workout (a fresh, different session) without touching
   * any other day. Keeps the same duration / location / equipment / level; cycles
   * the focus so the user gets variety.
   */
  async regenerateDay(userId: string, sessionId: string): Promise<WeeklyWorkoutPlan> {
    const row = await this.ownedSession(userId, sessionId);
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { id: row.planId, userId },
    });
    const level = (plan?.level ?? 'beginner') as Level;
    const equipment = row.equipment as unknown as Equipment[];
    const focus = this.nextFocus(row.focus as Focus);
    const w = this.workouts.generate({
      location: row.location as Location,
      durationMin: row.durationMin,
      equipment,
      focus,
      level,
    });
    await this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        title: w.title,
        focus: w.focus,
        focusLabel: w.focusLabel,
        estimatedCalories: w.estimatedCalories,
        warmup: w.warmup as unknown as Prisma.InputJsonValue,
        exercises: w.main as unknown as Prisma.InputJsonValue,
        coachNote: w.coachNote,
        status: 'planned',
      },
    });
    return this.loadPlan(userId, row.planId);
  }

  private nextFocus(current: Focus): Focus {
    const order: Focus[] = ['strength', 'cardio', 'mobility', 'balanced'];
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length] ?? 'balanced';
    return next === current ? order[(idx + 2) % order.length] : next;
  }

  // ── Standalone (today-only) workouts ─────────────────────────────────────────

  /** Generate + persist a one-off workout for `todayISO`, replacing today's. */
  async saveStandaloneWorkout(
    userId: string,
    dto: CreateStandaloneWorkoutDto,
    todayISO: string = serverTodayISO(),
  ) {
    const w = this.workouts.generate({
      location: dto.location,
      durationMin: dto.durationMin,
      equipment: dto.equipment,
      focus: dto.focus,
      level: dto.level,
      title: dto.title,
    });
    const date = new Date(`${todayISO}T00:00:00.000Z`);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.standaloneWorkout.deleteMany({ where: { userId, date } });
      return tx.standaloneWorkout.create({
        data: {
          userId,
          date,
          title: w.title,
          focus: w.focus,
          focusLabel: w.focusLabel,
          durationMin: w.durationMin,
          location: w.location,
          equipment: w.equipment as unknown as Prisma.InputJsonValue,
          estimatedCalories: w.estimatedCalories,
          warmup: w.warmup as unknown as Prisma.InputJsonValue,
          exercises: w.main as unknown as Prisma.InputJsonValue,
          coachNote: w.coachNote,
          status: 'planned',
        },
      });
    });
    return this.toStandalone(row);
  }

  /** Today's persisted standalone workout, if any. */
  async currentStandaloneWorkout(
    userId: string,
    todayISO: string = serverTodayISO(),
  ) {
    const date = new Date(`${todayISO}T00:00:00.000Z`);
    const row = await this.prisma.standaloneWorkout.findFirst({
      where: { userId, date },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toStandalone(row) : null;
  }

  async setStandaloneStatus(userId: string, id: string, status: string) {
    const row = await this.prisma.standaloneWorkout.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException('Workout not found');
    }
    const updated = await this.prisma.standaloneWorkout.update({
      where: { id },
      data: { status },
    });
    return this.toStandalone(updated);
  }

  private toStandalone(row: {
    id: string;
    date: Date;
    title: string;
    focus: string;
    focusLabel: string;
    durationMin: number;
    location: string;
    equipment: Prisma.JsonValue;
    estimatedCalories: number;
    warmup: Prisma.JsonValue;
    exercises: Prisma.JsonValue;
    coachNote: string;
    status: string;
  }) {
    return {
      id: row.id,
      date: isoDate(new Date(row.date)),
      title: row.title,
      focus: row.focus,
      focusLabel: row.focusLabel,
      durationMin: row.durationMin,
      location: row.location,
      equipment: row.equipment,
      estimatedCalories: row.estimatedCalories,
      warmup: row.warmup,
      main: row.exercises, // iOS GeneratedWorkout uses `main`
      coachNote: row.coachNote,
      status: row.status,
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async activePlan(userId: string) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
      include: { sessions: true },
    });
    if (!plan) throw new NotFoundException('No active plan');
    return plan;
  }

  /** Load a specific plan as a DTO without triggering week roll-forward. */
  private async loadPlan(
    userId: string,
    planId: string,
  ): Promise<WeeklyWorkoutPlan> {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { id: planId, userId },
      include: { sessions: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.toPlan(plan, plan.sessions);
  }

  /** Keep selectedDays in sync with the sessions' actual weekdays. */
  private async syncSelectedDays(planId: string): Promise<void> {
    const rows = await this.prisma.workoutSession.findMany({
      where: { planId },
    });
    const days = Array.from(new Set(rows.map((r) => r.weekday))).sort(
      (a, b) => weekdayIndex(a) - weekdayIndex(b),
    );
    await this.prisma.workoutPlan.update({
      where: { id: planId },
      data: { selectedDays: days as Prisma.InputJsonValue },
    });
  }

  private async setStatus(
    userId: string,
    sessionId: string,
    status: SessionStatus,
  ): Promise<WeeklyWorkoutPlan> {
    const session = await this.ownedSession(userId, sessionId);
    await this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: { status },
    });
    return this.loadPlan(userId, session.planId);
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
