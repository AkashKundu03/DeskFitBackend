import type { CoachProfileInput } from '../coach.types';

// ─────────────────────────────────────────────────────────────────────────────
// DEMO / SAMPLE data only. Clearly marked `isDemo: true`. Never real user data.
// Used for the VC demo flow and local UI development when the DB is empty.
// ─────────────────────────────────────────────────────────────────────────────

export interface DemoProfile {
  id: string;
  isDemo: true;
  label: string;
  description: string;
  /** Demo narrative: which planned weekday (if any) was missed. */
  missedWeekday: string | null;
  profile: CoachProfileInput;
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'busy-it-worker',
    isDemo: true,
    label: 'Busy IT worker',
    description: 'Sits 9+ hrs, wants to drop 10 kg in 4 months without crash dieting.',
    missedWeekday: null,
    profile: {
      name: 'Arjun',
      age: 31,
      gender: 'male',
      heightCm: 178,
      weightKg: 75,
      targetWeightKg: 65,
      activityLevel: 'sedentary',
      goal: 'fatLoss',
      timelineMonths: 4,
    },
  },
  {
    id: 'beginner-home',
    isDemo: true,
    label: 'Beginner home-workout user',
    description: 'New to training, no equipment, building a consistent habit.',
    missedWeekday: null,
    profile: {
      name: 'Meera',
      age: 28,
      gender: 'female',
      heightCm: 162,
      weightKg: 64,
      targetWeightKg: 58,
      activityLevel: 'light',
      goal: 'fatLoss',
      timelineMonths: 5,
    },
  },
  {
    id: 'gym-muscle-gain',
    isDemo: true,
    label: 'Gym muscle-gain user',
    description: 'Trains at a gym, wants to build strength and lean size.',
    missedWeekday: null,
    profile: {
      name: 'Daniel',
      age: 26,
      gender: 'male',
      heightCm: 180,
      weightKg: 72,
      targetWeightKg: 78,
      activityLevel: 'moderate',
      goal: 'muscleGain',
      timelineMonths: 6,
    },
  },
  {
    id: 'inconsistent-missed-two',
    isDemo: true,
    label: 'Inconsistent user (missed 2 workouts)',
    description: 'Crunch week at work — missed Friday. Needs supportive adaptation.',
    missedWeekday: 'Fri',
    profile: {
      name: 'Sana',
      age: 34,
      gender: 'female',
      heightCm: 168,
      weightKg: 70,
      targetWeightKg: 63,
      activityLevel: 'sedentary',
      goal: 'fatLoss',
      timelineMonths: 5,
    },
  },
  {
    id: 'maintenance-3x',
    isDemo: true,
    label: 'Maintenance user (3 days/week)',
    description: 'Happy with weight, trains 3×/week to stay healthy and energised.',
    missedWeekday: null,
    profile: {
      name: 'Rohan',
      age: 38,
      gender: 'male',
      heightCm: 175,
      weightKg: 74,
      targetWeightKg: 74,
      activityLevel: 'light',
      goal: 'maintenance',
      timelineMonths: 0,
    },
  },
];

export function findDemoProfile(id: string): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.id === id);
}
