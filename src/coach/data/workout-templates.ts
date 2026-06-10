import type { Equipment, Focus, Level, Location } from '../coach.types';

// ─────────────────────────────────────────────────────────────────────────────
// Curated workout templates. The generator can either expand a template or build
// a fresh session from the exercise library; templates give demos a known-good,
// human-curated feel and anchor the weekly plan.
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string;
  title: string;
  focus: Focus;
  durationMin: number;
  location: Location;
  equipment: Equipment[];
  level: Level;
  /** Ordered exercise ids (must exist in EXERCISES). */
  warmupIds: string[];
  mainIds: string[];
  coachNote: string;
  isDemo?: boolean;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tmpl_desk_reset_10',
    title: '10-minute desk reset',
    focus: 'mobility',
    durationMin: 10,
    location: 'office',
    equipment: ['none'],
    level: 'beginner',
    warmupIds: ['ex_desk_neck_rolls'],
    mainIds: [
      'ex_desk_chair_squat',
      'ex_desk_wall_pushup',
      'ex_desk_hip_flexor_stretch',
      'ex_mob_cat_cow',
    ],
    coachNote:
      'A few minutes between meetings undoes hours of sitting. This counts.',
  },
  {
    id: 'tmpl_fatloss_home_20',
    title: '20-minute fat-loss home workout',
    focus: 'fatLoss',
    durationMin: 20,
    location: 'home',
    equipment: ['bodyweight'],
    level: 'beginner',
    warmupIds: ['ex_mob_worlds_greatest'],
    mainIds: [
      'ex_bw_squat',
      'ex_bw_lunge',
      'ex_bw_mountain_climber',
      'ex_core_plank',
    ],
    coachNote: 'Short and effective — keep the rests honest and you’re done in 20.',
  },
  {
    id: 'tmpl_dumbbell_fullbody_30',
    title: '30-minute dumbbell full body',
    focus: 'balanced',
    durationMin: 30,
    location: 'home',
    equipment: ['dumbbells'],
    level: 'intermediate',
    warmupIds: ['ex_mob_worlds_greatest'],
    mainIds: [
      'ex_db_goblet_squat',
      'ex_db_row',
      'ex_db_shoulder_press',
      'ex_db_rdl',
      'ex_core_deadbug',
    ],
    coachNote: 'One pass through, controlled reps. Quality over speed.',
  },
  {
    id: 'tmpl_gym_strength_45',
    title: '45-minute gym strength',
    focus: 'strength',
    durationMin: 45,
    location: 'gym',
    equipment: ['barbell', 'bench', 'dumbbells'],
    level: 'advanced',
    warmupIds: ['ex_mob_worlds_greatest', 'ex_band_pull_apart'],
    mainIds: [
      'ex_bb_back_squat',
      'ex_bench_press',
      'ex_db_row',
      'ex_core_plank',
    ],
    coachNote: 'Leave 1–2 reps in the tank on every set. Strength is a long game.',
  },
  {
    id: 'tmpl_outdoor_fatloss',
    title: 'Outdoor walk/run fat-loss session',
    focus: 'cardio',
    durationMin: 25,
    location: 'outdoor',
    equipment: ['none'],
    level: 'beginner',
    warmupIds: ['ex_outdoor_brisk_walk'],
    mainIds: ['ex_outdoor_jog', 'ex_outdoor_brisk_walk'],
    coachNote: 'Fresh air counts double after a long screen day.',
  },
  {
    id: 'tmpl_mobility_recovery',
    title: 'Mobility recovery day',
    focus: 'mobility',
    durationMin: 20,
    location: 'home',
    equipment: ['bodyweight'],
    level: 'beginner',
    warmupIds: ['ex_desk_neck_rolls'],
    mainIds: [
      'ex_mob_cat_cow',
      'ex_mob_worlds_greatest',
      'ex_desk_hip_flexor_stretch',
      'ex_rec_box_breathing',
    ],
    coachNote: 'Recovery is training too. Move easy, breathe, reset.',
  },
  {
    id: 'tmpl_beginner_lowimpact',
    title: 'Beginner low-impact workout',
    focus: 'balanced',
    durationMin: 20,
    location: 'home',
    equipment: ['bodyweight'],
    level: 'beginner',
    warmupIds: ['ex_desk_neck_rolls'],
    mainIds: [
      'ex_bw_glute_bridge',
      'ex_desk_chair_squat',
      'ex_band_row',
      'ex_core_deadbug',
    ],
    coachNote: 'Joint-friendly and confidence-building. Perfect first week.',
  },
  {
    id: 'tmpl_muscle_gym_45',
    title: 'Muscle-building gym workout',
    focus: 'muscleBuilding',
    durationMin: 45,
    location: 'gym',
    equipment: ['barbell', 'dumbbells', 'pullupBar'],
    level: 'advanced',
    warmupIds: ['ex_band_pull_apart'],
    mainIds: [
      'ex_bb_deadlift',
      'ex_db_shoulder_press',
      'ex_pullup',
      'ex_db_rdl',
    ],
    coachNote: 'Chase a little more than last week — reps, weight, or cleaner form.',
  },
];

/**
 * A balanced demo week for an inconsistent desk worker. Focus labels here drive
 * the weekly-plan card. Deterministic by weekday index.
 */
export const BALANCED_WEEK: { weekday: string; focus: Focus | 'rest' }[] = [
  { weekday: 'Mon', focus: 'fatLoss' },
  { weekday: 'Tue', focus: 'mobility' },
  { weekday: 'Wed', focus: 'strength' },
  { weekday: 'Thu', focus: 'rest' },
  { weekday: 'Fri', focus: 'cardio' },
  { weekday: 'Sat', focus: 'balanced' },
  { weekday: 'Sun', focus: 'rest' },
];
