import { Injectable } from '@nestjs/common';
import type {
  Equipment,
  ExerciseItem,
  Focus,
  GeneratedWorkout,
  Level,
  Location,
} from './coach.types';
import { EXERCISES, type ExerciseDef } from './data/exercises';

export interface GenerateWorkoutInput {
  location: Location;
  durationMin: number;
  equipment: Equipment[];
  focus: Focus;
  level: Level;
  title?: string;
}

const LEVEL_RANK: Record<Level, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const FOCUS_LABEL: Record<Focus, string> = {
  fatLoss: 'Fat-loss day',
  strength: 'Strength day',
  muscleBuilding: 'Muscle-building day',
  mobility: 'Recovery day',
  cardio: 'Cardio day',
  balanced: 'Balanced day',
};

/** Which exercise categories a focus prefers, in priority order. */
const FOCUS_CATEGORIES: Record<Focus, ExerciseDef['category'][]> = {
  fatLoss: ['cardio', 'strength', 'core'],
  strength: ['strength', 'core'],
  muscleBuilding: ['strength', 'core'],
  mobility: ['mobility', 'recovery'],
  cardio: ['cardio'],
  balanced: ['strength', 'cardio', 'core', 'mobility'],
};

@Injectable()
export class WorkoutsService {
  generate(input: GenerateWorkoutInput): GeneratedWorkout {
    const available = this.availableEquipment(input.equipment);
    const pool = EXERCISES.filter(
      (e) =>
        this.locationOk(e, input.location) &&
        available.has(e.equipment) &&
        LEVEL_RANK[e.level] <= LEVEL_RANK[input.level],
    );

    const warmup = this.pickWarmup(pool, input.location);
    const main = this.pickMain(
      pool,
      input.focus,
      input.durationMin,
      warmup,
      input.equipment,
    );

    const estimatedCalories = this.estimateCalories(
      [...warmup, ...main],
      input.durationMin,
    );

    return {
      id: `w_${input.focus}_${input.durationMin}_${input.location}`,
      title: input.title ?? this.defaultTitle(input),
      focus: input.focus,
      focusLabel: FOCUS_LABEL[input.focus],
      durationMin: input.durationMin,
      location: input.location,
      equipment: input.equipment,
      estimatedCalories,
      warmup: warmup.map((e) => this.toItem(e)),
      main: main.map((e) => this.toItem(e)),
      coachNote: this.coachNote(input.focus, input.durationMin),
      completed: false,
    };
  }

  /** A shorter, lighter version of an existing request (missed-workout flow). */
  generateShorter(input: GenerateWorkoutInput): GeneratedWorkout {
    const shorterMin = Math.max(10, Math.round(input.durationMin / 2));
    const w = this.generate({ ...input, durationMin: shorterMin });
    return {
      ...w,
      title: `Shorter ${w.focusLabel.toLowerCase()} (${shorterMin} min)`,
      coachNote:
        'No problem — a shorter session still keeps your momentum. Showing up is the win today.',
    };
  }

  markCompleted(workout: GeneratedWorkout): {
    workout: GeneratedWorkout;
    coachMessage: string;
  } {
    return {
      workout: { ...workout, completed: true },
      coachMessage:
        'Nice work — that’s another day your body and focus will thank you for. Consistency is compounding.',
    };
  }

  markSkipped(workout: GeneratedWorkout): {
    workout: GeneratedWorkout;
    coachMessage: string;
    options: { id: string; label: string }[];
  } {
    return {
      workout: { ...workout, completed: false },
      coachMessage:
        'Missed one? That’s normal on a busy week — no guilt here. Pick what fits today and we’ll keep your week on track.',
      options: [
        { id: 'move_today', label: 'Move it to today' },
        { id: 'shorter', label: 'Create a shorter version' },
        { id: 'rebalance', label: 'Rebalance this week' },
        { id: 'skip', label: 'Skip and continue' },
      ],
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private availableEquipment(equipment: Equipment[]): Set<Equipment> {
    // Bodyweight & "none" are always available.
    const set = new Set<Equipment>(equipment);
    set.add('none');
    set.add('bodyweight');
    return set;
  }

  private locationOk(e: ExerciseDef, location: Location): boolean {
    if (location === 'mixed') return true;
    return e.locations.includes(location) || e.locations.includes('mixed');
  }

  private pickWarmup(pool: ExerciseDef[], location: Location): ExerciseDef[] {
    const warmCandidates = pool.filter(
      (e) => e.category === 'mobility' || e.category === 'recovery',
    );
    const chosen = warmCandidates[0];
    if (chosen) return [chosen];
    // Deterministic fallback so a warmup always exists.
    const fallback =
      EXERCISES.find((e) => e.id === 'ex_mob_worlds_greatest') ??
      EXERCISES.find((e) => e.id === 'ex_desk_neck_rolls');
    return fallback ? [fallback] : [];
  }

  private pickMain(
    pool: ExerciseDef[],
    focus: Focus,
    durationMin: number,
    warmup: ExerciseDef[],
    requestedEquipment: Equipment[],
  ): ExerciseDef[] {
    const warmIds = new Set(warmup.map((e) => e.id));
    const wanted = FOCUS_CATEGORIES[focus];
    // Equipment the user explicitly chose (bodyweight/none are always implied, so
    // they don't count as a deliberate preference).
    const preferred = new Set<Equipment>(
      requestedEquipment.filter((e) => e !== 'bodyweight' && e !== 'none'),
    );
    const usesPreferred = (e: ExerciseDef) => (preferred.has(e.equipment) ? 0 : 1);
    // Rank by: requested-equipment first, then focus-category priority, then
    // stable id order for determinism.
    const ranked = pool
      .filter((e) => !warmIds.has(e.id) && wanted.includes(e.category))
      .sort((a, b) => {
        const ea = usesPreferred(a);
        const eb = usesPreferred(b);
        if (ea !== eb) return ea - eb;
        const pa = wanted.indexOf(a.category);
        const pb = wanted.indexOf(b.category);
        return pa !== pb ? pa - pb : a.id.localeCompare(b.id);
      });

    // ~8 min per main exercise (incl. rest); clamp to a sensible range.
    const count = Math.min(
      Math.max(3, Math.round(durationMin / 8)),
      6,
      ranked.length,
    );
    const chosen = ranked.slice(0, count);

    // If the focus pool was thin, top up with any remaining pool exercises.
    if (chosen.length < 3) {
      for (const e of pool) {
        if (chosen.length >= 3) break;
        if (!warmIds.has(e.id) && !chosen.includes(e)) chosen.push(e);
      }
    }
    return chosen;
  }

  private estimateCalories(list: ExerciseDef[], durationMin: number): number {
    if (list.length === 0) return Math.round(durationMin * 5);
    const avgKcalPerMin =
      list.reduce((sum, e) => sum + e.kcalPerMin, 0) / list.length;
    return Math.round(avgKcalPerMin * durationMin);
  }

  private toItem(e: ExerciseDef): ExerciseItem {
    return {
      id: e.id,
      name: e.name,
      category: e.category,
      detail: e.setsReps ?? e.timeOption ?? '',
      rest: e.rest,
      cue: e.cue,
      lowImpactAlternative: e.lowImpactAlternative,
    };
  }

  private defaultTitle(input: GenerateWorkoutInput): string {
    const loc =
      input.location === 'office'
        ? 'desk'
        : input.location === 'home'
          ? 'home'
          : input.location;
    return `${input.durationMin}-minute ${loc} ${FOCUS_LABEL[input.focus].toLowerCase()}`;
  }

  private coachNote(focus: Focus, durationMin: number): string {
    if (focus === 'mobility')
      return 'Move easy and breathe — this is how you undo a day of sitting.';
    if (durationMin <= 15)
      return 'Short and focused. A little, often, beats perfect-but-never.';
    if (focus === 'fatLoss')
      return 'Keep the rests honest and the effort steady. You’ve got this.';
    return 'Leave a rep or two in the tank and finish feeling strong, not wrecked.';
  }
}
