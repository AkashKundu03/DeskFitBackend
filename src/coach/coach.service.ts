import { Injectable } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import {
  WorkoutsService,
  type GenerateWorkoutInput,
} from './workouts.service';
import type {
  CoachProfileInput,
  ConsistencyCoach,
  Focus,
  GeneratedWorkout,
  Level,
  Location,
  TodayResponse,
  WeeklyDay,
  WeeklyPlan,
} from './coach.types';
import { BALANCED_WEEK } from './data/workout-templates';

const FOCUS_LABEL: Record<Focus | 'rest', string> = {
  fatLoss: 'Fat-loss day',
  strength: 'Strength day',
  muscleBuilding: 'Muscle-building day',
  mobility: 'Recovery day',
  cardio: 'Cardio day',
  balanced: 'Balanced day',
  rest: 'Rest',
};

const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Injectable()
export class CoachService {
  constructor(
    private readonly nutrition: NutritionService,
    private readonly workouts: WorkoutsService,
  ) {}

  /** Full Today coach dashboard payload. */
  today(
    profile: CoachProfileInput,
    opts: { missedWeekday?: string | null; isDemo?: boolean } = {},
  ): TodayResponse {
    const nutrition = this.nutrition.calculateTargets(profile);
    const todayName = this.todayWeekday();
    const todaysFocus = this.focusForWeekday(todayName);
    const workout = this.workouts.generate(
      this.workoutInputFor(profile, todaysFocus),
    );
    const weekly = this.buildWeekly(todayName, opts.missedWeekday ?? null);
    const consistency = this.consistency(opts.missedWeekday ?? null);

    return {
      greeting: this.greeting(profile),
      goalContext: this.goalContext(profile, nutrition.foodTargetKcal),
      focusLabel: FOCUS_LABEL[todaysFocus],
      coachMessage: this.coachMessage(
        todaysFocus,
        nutrition.foodTargetKcal,
        nutrition.proteinG,
      ),
      nutrition,
      workout,
      weekly,
      consistency,
      isDemo: opts.isDemo ?? false,
    };
  }

  /** Rebalance the week using a supportive strategy. Deterministic. */
  adjustWeek(
    weekly: WeeklyPlan,
    strategy: 'move_today' | 'shorter' | 'rebalance' | 'skip',
  ): { weekly: WeeklyPlan; message: string } {
    const days = weekly.days.map((d) => ({ ...d }));
    const todayName = this.todayWeekday();
    const missed = days.find((d) => d.status === 'missed');

    let message =
      'Done — your week is balanced again. Forward is the only direction that matters.';

    if (missed) {
      if (strategy === 'move_today' || strategy === 'shorter') {
        const today = days.find((d) => d.weekday === todayName);
        if (today && today.status !== 'completed') {
          today.focusLabel =
            strategy === 'shorter'
              ? `Shorter ${missed.focusLabel.toLowerCase()}`
              : missed.focusLabel;
          today.status = 'today';
        }
        missed.status = 'rest';
        missed.focusLabel = 'Rest';
        message =
          strategy === 'shorter'
            ? 'I moved a shorter version to today. Lighter still counts — your week stays on track.'
            : 'Moved to today. One flexible day keeps the whole week intact.';
      } else if (strategy === 'rebalance') {
        // Push the missed session to the next rest day this week.
        const nextRest = days.find(
          (d) =>
            d.status === 'rest' &&
            WEEKDAY_ORDER.indexOf(d.weekday) >
              WEEKDAY_ORDER.indexOf(missed.weekday),
        );
        if (nextRest) {
          nextRest.focusLabel = missed.focusLabel;
          nextRest.status = 'planned';
        }
        missed.status = 'rest';
        missed.focusLabel = 'Rest';
        message =
          'Rebalanced — I slotted the session into a free day so nothing piles up.';
      } else {
        // skip and continue
        missed.status = 'rest';
        missed.focusLabel = 'Rest';
        message =
          'Skipped, no problem. The best plan is the one you can keep — onward.';
      }
    }

    return { weekly: this.recount({ ...weekly, days }), message };
  }

  // ── plan construction ──────────────────────────────────────────────────────

  buildWeekly(todayName: string, missedWeekday: string | null): WeeklyPlan {
    const todayIdx = WEEKDAY_ORDER.indexOf(todayName);
    const days: WeeklyDay[] = BALANCED_WEEK.map(({ weekday, focus }) => {
      const idx = WEEKDAY_ORDER.indexOf(weekday);
      const label = FOCUS_LABEL[focus];
      let status: WeeklyDay['status'];
      if (focus === 'rest') {
        status = 'rest';
      } else if (weekday === missedWeekday) {
        status = 'missed';
      } else if (weekday === todayName) {
        status = 'today';
      } else if (idx < todayIdx) {
        status = 'completed';
      } else {
        status = 'planned';
      }
      return { weekday, focusLabel: label, status };
    });
    return this.recount({
      days,
      completedCount: 0,
      plannedCount: 0,
      missedCount: 0,
    });
  }

  private recount(plan: WeeklyPlan): WeeklyPlan {
    return {
      ...plan,
      completedCount: plan.days.filter((d) => d.status === 'completed').length,
      plannedCount: plan.days.filter(
        (d) => d.status === 'planned' || d.status === 'today',
      ).length,
      missedCount: plan.days.filter((d) => d.status === 'missed').length,
    };
  }

  private consistency(missedWeekday: string | null): ConsistencyCoach {
    if (!missedWeekday) {
      return {
        missedDay: null,
        message:
          'You’re showing up — that’s the whole game. Keep the streak going at your own pace.',
        options: [],
      };
    }
    const full = this.fullWeekdayName(missedWeekday);
    return {
      missedDay: full,
      message: `You missed ${full}. No problem — I can make today lighter and still keep your week on track.`,
      options: [
        { id: 'move_today', label: 'Move it to today' },
        { id: 'shorter', label: 'Create a shorter version' },
        { id: 'rebalance', label: 'Rebalance this week' },
        { id: 'skip', label: 'Skip and continue' },
      ],
    };
  }

  // ── mapping helpers ────────────────────────────────────────────────────────

  private focusForWeekday(weekday: string): Focus {
    const entry = BALANCED_WEEK.find((d) => d.weekday === weekday);
    if (!entry || entry.focus === 'rest') return 'mobility';
    return entry.focus;
  }

  private workoutInputFor(
    p: CoachProfileInput,
    focus: Focus,
  ): GenerateWorkoutInput {
    const level: Level =
      p.activityLevel === 'sedentary' || p.activityLevel === 'light'
        ? 'beginner'
        : p.activityLevel === 'moderate'
          ? 'intermediate'
          : 'advanced';
    // Busy desk workers default to short, equipment-light home/office sessions.
    const location: Location =
      p.goal === 'muscleGain' ? 'gym' : focus === 'mobility' ? 'office' : 'home';
    const equipment =
      p.goal === 'muscleGain'
        ? (['dumbbells', 'barbell', 'bench'] as const)
        : (['bodyweight'] as const);
    const durationMin =
      focus === 'mobility' ? 15 : p.goal === 'muscleGain' ? 45 : 25;
    return {
      location,
      durationMin,
      equipment: [...equipment],
      focus,
      level,
    };
  }

  // ── copy helpers ───────────────────────────────────────────────────────────

  private greeting(p: CoachProfileInput): string {
    const name = p.name?.trim() ? p.name.trim() : 'there';
    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    return `Good ${part}, ${name}`;
  }

  private goalContext(p: CoachProfileInput, foodTarget: number): string {
    if (p.goal === 'fatLoss') {
      const months = p.timelineMonths && p.timelineMonths > 0 ? p.timelineMonths : 4;
      return `To move from ${p.weightKg} kg to ${p.targetWeightKg} kg in about ${months} months, your food target is around ${foodTarget.toLocaleString()} kcal/day.`;
    }
    if (p.goal === 'muscleGain') {
      return `Building toward ${p.targetWeightKg} kg with a steady, strength-focused plan.`;
    }
    return 'Holding your progress and keeping your energy steady through long desk days.';
  }

  private coachMessage(
    focus: Focus,
    foodTarget: number,
    proteinG: number,
  ): string {
    const food = foodTarget.toLocaleString();
    if (focus === 'mobility') {
      return `Today is a recovery day. Keep your food target around ${food} kcal and aim for ${proteinG}g protein. A few minutes of easy movement is enough to stay on track.`;
    }
    if (focus === 'cardio') {
      return `Today is a cardio day. Keep your food target around ${food} kcal and hit ${proteinG}g protein. Even a brisk walk after work counts.`;
    }
    if (focus === 'strength' || focus === 'muscleBuilding') {
      return `Today is a strength day. Fuel around ${food} kcal and ${proteinG}g protein to recover well and build.`;
    }
    return `Today is a fat-loss day. Keep your food target around ${food} kcal and hit ${proteinG}g protein. A short workout is enough to stay on track.`;
  }

  private todayWeekday(): string {
    // 0 = Sunday … 6 = Saturday → our Mon-first labels.
    const js = new Date().getDay();
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return map[js];
  }

  private fullWeekdayName(short: string): string {
    const map: Record<string, string> = {
      Mon: 'Monday',
      Tue: 'Tuesday',
      Wed: 'Wednesday',
      Thu: 'Thursday',
      Fri: 'Friday',
      Sat: 'Saturday',
      Sun: 'Sunday',
    };
    return map[short] ?? short;
  }
}
