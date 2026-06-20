// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 planner contract — frontend-friendly shapes for the weekly workout
// planner and the meal-target planner. These are what the iOS app decodes.
// Generation stays deterministic (no AI). Day-wise sessions carry a lifecycle
// status so the app can render planned / completed / skipped / rescheduled.
// ─────────────────────────────────────────────────────────────────────────────

import type { Equipment, ExerciseItem, Focus, Location } from './coach.types';

export const WEEKDAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type SessionStatus =
  | 'planned'
  | 'completed'
  | 'skipped'
  | 'rescheduled';

/** One day's distinct workout inside a weekly plan. */
export interface WeeklySession {
  id: string;
  weekday: string; // "Mon"
  date: string; // ISO date (yyyy-mm-dd)
  title: string;
  focus: Focus;
  focusLabel: string;
  durationMin: number;
  location: Location;
  equipment: Equipment[];
  estimatedCalories: number;
  warmup: ExerciseItem[];
  exercises: ExerciseItem[]; // main work
  coachNote: string;
  status: SessionStatus;
}

export interface WeeklyWorkoutPlan {
  id: string;
  weekStartDate: string; // ISO date of Monday
  selectedDays: string[];
  goal: string | null;
  level: string | null;
  location: string | null;
  sessions: WeeklySession[];
  completedCount: number;
  plannedCount: number;
  skippedCount: number;
}

// ── Meal target planner ──────────────────────────────────────────────────────

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStatus = 'planned' | 'completed' | 'skipped';

export type DietaryPref =
  | 'vegetarian'
  | 'eggitarian'
  | 'nonVegetarian'
  | 'vegan'
  | 'mixed';
export type ProteinPref =
  | 'paneer'
  | 'tofu'
  | 'fish'
  | 'chicken'
  | 'eggs'
  | 'dal'
  | 'whey';
export type CarbPref = 'rice' | 'roti' | 'oats' | 'potato' | 'quinoa' | 'mixed';
export type FiberPref = 'vegetables' | 'fruits' | 'salad' | 'legumes';
export type Allergen = 'lactose' | 'gluten' | 'nuts' | 'none';

export interface MealTarget {
  id: string;
  slot: MealSlot;
  name: string; // "Breakfast"
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  suggestions: string[]; // simple sample combos (not a food DB)
  coachNote: string;
  status: MealStatus;
}

export interface MealPlanResult {
  id: string;
  mealCount: number;
  dietaryPref: string;
  proteinPrefs: string[];
  carbPrefs: string[];
  fiberPrefs: string[];
  allergens: string[];
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  meals: MealTarget[];
  coachNote: string;
}

// ── small date helpers (shared by the planner services) ──────────────────────

/** Monday (UTC, date-only) of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = date.getUTCDay(); // 0 = Sun … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

export function weekdayIndex(weekday: string): number {
  return WEEKDAYS.indexOf(weekday as Weekday);
}

/** Date (yyyy-mm-dd) for a weekday within the week starting at `monday`. */
export function dateForWeekday(monday: Date, weekday: string): string {
  const idx = Math.max(0, weekdayIndex(weekday));
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + idx);
  return d.toISOString().slice(0, 10);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
