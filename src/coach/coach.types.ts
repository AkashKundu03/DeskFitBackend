// ─────────────────────────────────────────────────────────────────────────────
// Shared, frontend-friendly types for the deterministic DeskFit coach engine.
// These shapes are the contract the iOS app decodes. No technical jargon leaks
// into user-facing fields — labels are coach-friendly ("Fat-loss day", etc.).
// ─────────────────────────────────────────────────────────────────────────────

export type Goal = 'fatLoss' | 'muscleGain' | 'maintenance';
export type Location = 'gym' | 'home' | 'outdoor' | 'office' | 'mixed';
export type Focus =
  | 'fatLoss'
  | 'strength'
  | 'muscleBuilding'
  | 'mobility'
  | 'cardio'
  | 'balanced';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Equipment =
  | 'bodyweight'
  | 'dumbbells'
  | 'barbell'
  | 'bench'
  | 'resistanceBand'
  | 'pullupBar'
  | 'treadmill'
  | 'cycle'
  | 'none';
export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'core'
  | 'recovery';
export type DayStatus = 'planned' | 'completed' | 'missed' | 'today' | 'rest';

export interface CoachProfileInput {
  name?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
  goal: Goal;
  timelineMonths?: number; // for fat-loss / muscle-gain pacing
}

export interface NutritionSafety {
  isAggressive: boolean;
  message: string | null;
  saferTimelineMonths: number | null;
}

export interface NutritionTargets {
  goal: Goal;
  goalLabel: string; // "Fat-loss day" etc. (user-facing)
  dailyBurnKcal: number; // friendly name for TDEE
  foodTargetKcal: number; // daily food target
  deficitKcal: number; // burn - food (positive = deficit, negative = surplus)
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  coachExplanation: string;
  safety: NutritionSafety;
  // Technical values are tucked away for an optional "How this is calculated" UI.
  howCalculated: {
    bmr: number;
    tdee: number;
    activityMultiplier: number;
    method: string;
  };
}

export interface ExerciseItem {
  id: string;
  name: string;
  category: ExerciseCategory;
  detail: string; // "3 × 12" or "12 min" — ready to render
  rest: string; // "60s rest"
  cue: string; // short coaching cue
  lowImpactAlternative: string | null;
}

export interface GeneratedWorkout {
  id: string;
  title: string;
  focus: Focus;
  focusLabel: string; // "Strength day"
  durationMin: number;
  location: Location;
  equipment: Equipment[];
  estimatedCalories: number;
  warmup: ExerciseItem[];
  main: ExerciseItem[];
  coachNote: string;
  completed: boolean;
}

export interface WeeklyDay {
  weekday: string; // "Mon"
  focusLabel: string; // "Strength day" / "Recovery day" / "Rest"
  status: DayStatus;
}

export interface WeeklyPlan {
  days: WeeklyDay[];
  completedCount: number;
  plannedCount: number;
  missedCount: number;
}

export interface ConsistencyCoach {
  missedDay: string | null; // "Friday"
  message: string;
  options: { id: string; label: string }[];
}

export interface TodayResponse {
  greeting: string;
  goalContext: string;
  focusLabel: string;
  coachMessage: string;
  nutrition: NutritionTargets;
  workout: GeneratedWorkout;
  weekly: WeeklyPlan;
  consistency: ConsistencyCoach;
  isDemo: boolean;
}
