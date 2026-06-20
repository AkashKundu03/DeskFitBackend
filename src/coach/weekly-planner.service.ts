import { Injectable } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import type { Equipment, Focus, Level, Location } from './coach.types';
import {
  WEEKDAYS,
  dateForWeekday,
  mondayOf,
  weekdayIndex,
  type WeeklySession,
} from './planner.types';

export interface WeeklyPlanInput {
  selectedDays: string[]; // subset of WEEKDAYS
  location: Location;
  durationMin: number;
  equipment: Equipment[];
  level: Level;
  goal: 'fatLoss' | 'muscleGain' | 'maintenance';
}

/** A distinct session blueprint — focus + a human title variant. */
interface Blueprint {
  focus: Focus;
  title: string;
}

// Each goal gets an ordered rotation of *distinct* sessions. We map the i-th
// selected day to BLUEPRINTS[i % len], then space intensity so two hard days
// don't land back-to-back. This guarantees every selected day gets its own
// workout (never the same one repeated) and respects basic recovery.
const BLUEPRINTS: Record<WeeklyPlanInput['goal'], Blueprint[]> = {
  fatLoss: [
    { focus: 'strength', title: 'Full-body strength' },
    { focus: 'cardio', title: 'Low-impact conditioning' },
    { focus: 'strength', title: 'Dumbbell strength' },
    { focus: 'cardio', title: 'Fat-loss intervals' },
    { focus: 'mobility', title: 'Mobility & core reset' },
    { focus: 'balanced', title: 'Balanced circuit' },
    { focus: 'mobility', title: 'Recovery flow' },
  ],
  muscleGain: [
    { focus: 'strength', title: 'Push strength' },
    { focus: 'strength', title: 'Pull strength' },
    { focus: 'mobility', title: 'Mobility & core' },
    { focus: 'strength', title: 'Lower-body strength' },
    { focus: 'balanced', title: 'Full-body pump' },
    { focus: 'cardio', title: 'Light conditioning' },
    { focus: 'mobility', title: 'Recovery flow' },
  ],
  maintenance: [
    { focus: 'balanced', title: 'Balanced full-body' },
    { focus: 'cardio', title: 'Steady cardio' },
    { focus: 'strength', title: 'Strength maintenance' },
    { focus: 'mobility', title: 'Mobility & core' },
    { focus: 'cardio', title: 'Active-recovery cardio' },
    { focus: 'balanced', title: 'Balanced circuit' },
    { focus: 'mobility', title: 'Recovery flow' },
  ],
};

const INTENSE: ReadonlySet<Focus> = new Set<Focus>([
  'strength',
  'muscleBuilding',
  'cardio',
  'fatLoss',
]);
const LIGHT_BLUEPRINTS: Blueprint[] = [
  { focus: 'mobility', title: 'Mobility & core reset' },
  { focus: 'balanced', title: 'Balanced circuit' },
];

@Injectable()
export class WeeklyPlannerService {
  constructor(private readonly workouts: WorkoutsService) {}

  /**
   * Build a week of distinct, day-wise sessions for the selected days. Pure and
   * deterministic — the same input always yields the same plan.
   */
  build(input: WeeklyPlanInput, now: Date = new Date()): WeeklySession[] {
    const monday = mondayOf(now);
    const days = this.orderedDays(input.selectedDays);

    // 1) Assign a distinct blueprint to each selected day by index.
    const pool = BLUEPRINTS[input.goal] ?? BLUEPRINTS.maintenance;
    const blueprints: Blueprint[] = days.map((_, i) => pool[i % pool.length]);

    // 2) Space intensity: if two calendar-adjacent selected days are both
    //    intense, swap the second to a light session to protect recovery.
    let lightCursor = 0;
    for (let i = 1; i < days.length; i++) {
      const prevAdjacent = weekdayIndex(days[i]) - weekdayIndex(days[i - 1]) === 1;
      if (
        prevAdjacent &&
        INTENSE.has(blueprints[i].focus) &&
        INTENSE.has(blueprints[i - 1].focus)
      ) {
        blueprints[i] = LIGHT_BLUEPRINTS[lightCursor % LIGHT_BLUEPRINTS.length];
        lightCursor++;
      }
    }

    // 3) Generate a real workout per day from the deterministic engine.
    return days.map((weekday, i) => {
      const bp = blueprints[i];
      const w = this.workouts.generate({
        location: input.location,
        durationMin: input.durationMin,
        equipment: input.equipment,
        focus: bp.focus,
        level: input.level,
        title: bp.title,
      });
      return {
        id: `${weekday}_${bp.focus}`,
        weekday,
        date: dateForWeekday(monday, weekday),
        title: bp.title,
        focus: w.focus,
        focusLabel: w.focusLabel,
        durationMin: w.durationMin,
        location: w.location,
        equipment: w.equipment,
        estimatedCalories: w.estimatedCalories,
        warmup: w.warmup,
        exercises: w.main,
        coachNote: w.coachNote,
        status: 'planned',
      };
    });
  }

  /** A shorter, same-focus version of a session (the "make today lighter" flow). */
  shorter(session: WeeklySession, level: Level): WeeklySession {
    const w = this.workouts.generateShorter({
      location: session.location,
      durationMin: session.durationMin,
      equipment: session.equipment,
      focus: session.focus,
      level,
      title: session.title,
    });
    return {
      ...session,
      title: `Shorter ${session.title.toLowerCase()} (${w.durationMin} min)`,
      durationMin: w.durationMin,
      estimatedCalories: w.estimatedCalories,
      warmup: w.warmup,
      exercises: w.main,
      coachNote: w.coachNote,
      status: 'planned',
    };
  }

  /**
   * Redistribute every non-completed session across the remaining days of the
   * week (today → Sunday), evenly spaced so nothing piles up back-to-back.
   * Completed sessions are left exactly where they are.
   */
  rebalance(sessions: WeeklySession[], now: Date = new Date()): WeeklySession[] {
    const monday = mondayOf(now);
    const todayIdx = Math.min(6, Math.max(0, this.todayIndex(now)));
    const remaining = WEEKDAYS.slice(todayIdx);

    const completed = sessions.filter((s) => s.status === 'completed');
    const movable = sessions.filter((s) => s.status !== 'completed');
    if (movable.length === 0 || remaining.length === 0) return sessions;

    const slots = this.spread(remaining as unknown as string[], movable.length);
    const rebalanced = movable.map((s, i) => {
      const weekday = slots[i];
      return {
        ...s,
        weekday,
        date: dateForWeekday(monday, weekday),
        status: 'planned' as const,
      };
    });

    return [...completed, ...rebalanced].sort(
      (a, b) => weekdayIndex(a.weekday) - weekdayIndex(b.weekday),
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private orderedDays(selected: string[]): string[] {
    const valid = selected.filter((d) =>
      (WEEKDAYS as readonly string[]).includes(d),
    );
    const unique = Array.from(new Set(valid));
    return unique.sort((a, b) => weekdayIndex(a) - weekdayIndex(b));
  }

  private todayIndex(now: Date): number {
    const day = now.getUTCDay(); // 0 = Sun
    return day === 0 ? 6 : day - 1; // Mon=0 … Sun=6
  }

  /** Evenly pick `count` weekdays out of `days`, avoiding clustering. */
  private spread(days: string[], count: number): string[] {
    if (count <= 0) return [];
    if (count >= days.length) {
      // More sessions than days left — fill days, then wrap to spread the rest.
      return Array.from({ length: count }, (_, i) => days[i % days.length]);
    }
    const out: string[] = [];
    const step = days.length / count;
    for (let i = 0; i < count; i++) {
      out.push(days[Math.floor(i * step)]);
    }
    return out;
  }
}
