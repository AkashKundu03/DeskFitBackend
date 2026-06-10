import type { Goal } from '../coach.types';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic nutrition rules + safety guardrails for the coach engine.
// All numbers are conservative, sustainable defaults — never crash-diet ranges.
// ─────────────────────────────────────────────────────────────────────────────

/** 1 kg of body fat ≈ 7700 kcal. */
export const KCAL_PER_KG_FAT = 7700;

/** Activity multipliers (mirror the iOS ActivityLevel multipliers). */
export const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

/** Absolute minimum daily food targets — never recommend below these. */
export const MIN_FOOD_KCAL = { male: 1500, female: 1200, other: 1400 };

/** Sustainable fat-loss guardrails. */
export const FAT_LOSS = {
  // Safe weekly loss as a fraction of current bodyweight (≈0.75%/week).
  safeWeeklyFraction: 0.0075,
  // Hard cap on weekly loss in kg, regardless of bodyweight.
  maxWeeklyKg: 1.0,
  // Never cut more than this fraction of daily burn.
  maxDeficitFraction: 0.25,
};

/** Muscle-gain guardrails (lean surplus). */
export const MUSCLE_GAIN = {
  surplusKcal: 300,
  proteinPerKg: 2.0,
};

/** Protein per kg of bodyweight by goal. */
export const PROTEIN_PER_KG: Record<Goal, number> = {
  fatLoss: 1.8, // preserve muscle in a deficit
  muscleGain: 2.0,
  maintenance: 1.6,
};

/** Dietary fat per kg of bodyweight (hormone/health floor). */
export const FAT_PER_KG = 0.8;

/** Fiber per 1000 kcal, with a sensible minimum. */
export const FIBER_PER_1000_KCAL = 14;
export const FIBER_MIN_G = 25;

/** User-facing goal labels (no technical jargon). */
export const GOAL_LABEL: Record<Goal, string> = {
  fatLoss: 'Fat-loss day',
  muscleGain: 'Strength day',
  maintenance: 'Balance day',
};

/** Friendly coach explanations keyed by goal. */
export const COACH_EXPLANATION: Record<Goal, string> = {
  fatLoss:
    'This keeps you in a steady, sustainable deficit — enough to lose fat without crashing your energy at work or losing muscle.',
  muscleGain:
    'A small surplus with high protein gives your body what it needs to build strength, without unnecessary fat gain.',
  maintenance:
    'This keeps your fuel near your daily burn so you hold your progress and feel steady through long desk days.',
};
