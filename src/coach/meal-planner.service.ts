import { Injectable } from '@nestjs/common';
import type { MealSlot, MealTarget, MealPlanResult } from './planner.types';

export interface MealPlanInput {
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  mealCount: number; // 2 | 3 | 4
  includeSnack?: boolean;
  dietaryPref: string;
  proteinPrefs: string[];
  carbPrefs: string[];
  fiberPrefs: string[];
  allergens: string[];
}

// Calorie share per slot for a given meal layout. Each layout sums to 1.0.
// Snack is added separately when requested.
const SLOT_WEIGHTS: Record<string, Partial<Record<MealSlot, number>>> = {
  '2': { breakfast: 0.45, dinner: 0.55 },
  '3': { breakfast: 0.27, lunch: 0.38, dinner: 0.35 },
  '4': { breakfast: 0.25, lunch: 0.32, snack: 0.13, dinner: 0.3 },
};

const SLOT_NAME: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

const PROTEIN_LABEL: Record<string, string> = {
  paneer: 'Paneer',
  tofu: 'Tofu',
  fish: 'Fish',
  chicken: 'Chicken',
  eggs: 'Eggs',
  dal: 'Dal / beans',
  whey: 'Whey shake',
};
const CARB_LABEL: Record<string, string> = {
  rice: 'Rice',
  roti: 'Roti',
  oats: 'Oats',
  potato: 'Potato',
  quinoa: 'Quinoa',
  mixed: 'Mixed grains',
};
const FIBER_LABEL: Record<string, string> = {
  vegetables: 'Veg',
  fruits: 'Fruit',
  salad: 'Salad',
  legumes: 'Legumes',
};

const SLOT_COACH: Record<MealSlot, string> = {
  breakfast: 'Front-load protein so you stay full through the morning desk block.',
  lunch: 'Your biggest plate — steady carbs here fuel the afternoon slump-free.',
  dinner: 'Protein + veg, lighter on carbs, so you sleep and recover well.',
  snack: 'A simple protein-forward bite to bridge the gap, not a second meal.',
};

@Injectable()
export class MealPlannerService {
  /**
   * Turn daily nutrition targets into a meal-wise target distribution. Phase 2
   * outputs targets (not full recipes) plus a couple of simple sample combos
   * built from the user's preferences. Deterministic, no food DB, no AI.
   */
  build(input: MealPlanInput, id = 'meal_plan'): MealPlanResult {
    const slots = this.resolveSlots(input.mealCount, input.includeSnack);
    const weights = this.normalizedWeights(slots, input.mealCount);

    const meals: MealTarget[] = [];
    // Allocate proportionally, then push rounding remainder onto dinner so the
    // per-meal totals always add back up to the daily target.
    const totals = {
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    };

    slots.forEach((slot, i) => {
      const last = i === slots.length - 1;
      const frac = weights[slot] ?? 0;
      const kcal = last
        ? input.dailyKcal - totals.kcal
        : Math.round(input.dailyKcal * frac);
      const proteinG = last
        ? input.proteinG - totals.proteinG
        : Math.round(input.proteinG * frac);
      const carbsG = last
        ? input.carbsG - totals.carbsG
        : Math.round(input.carbsG * frac);
      const fatG = last ? input.fatG - totals.fatG : Math.round(input.fatG * frac);
      const fiberG = last
        ? input.fiberG - totals.fiberG
        : Math.round(input.fiberG * frac);

      totals.kcal += kcal;
      totals.proteinG += proteinG;
      totals.carbsG += carbsG;
      totals.fatG += fatG;
      totals.fiberG += fiberG;

      meals.push({
        id: `${id}_${slot}`,
        slot,
        name: SLOT_NAME[slot],
        kcal: Math.max(0, kcal),
        proteinG: Math.max(0, proteinG),
        carbsG: Math.max(0, carbsG),
        fatG: Math.max(0, fatG),
        fiberG: Math.max(0, fiberG),
        suggestions: this.suggestions(slot, input),
        coachNote: SLOT_COACH[slot],
        status: 'planned',
      });
    });

    return {
      id,
      mealCount: input.mealCount,
      dietaryPref: input.dietaryPref,
      proteinPrefs: input.proteinPrefs,
      carbPrefs: input.carbPrefs,
      fiberPrefs: input.fiberPrefs,
      allergens: input.allergens,
      dailyKcal: input.dailyKcal,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fiberG: input.fiberG,
      meals,
      coachNote:
        'These are targets, not rules. Hit the protein number first, keep meals ' +
        'roughly to these sizes, and the day takes care of itself.',
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private resolveSlots(mealCount: number, includeSnack?: boolean): MealSlot[] {
    const base =
      mealCount <= 2
        ? (['breakfast', 'dinner'] as MealSlot[])
        : mealCount === 3
          ? (['breakfast', 'lunch', 'dinner'] as MealSlot[])
          : (['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]);
    if (includeSnack && !base.includes('snack')) {
      return SLOT_ORDER.filter((s) => base.includes(s) || s === 'snack');
    }
    return base;
  }

  private normalizedWeights(
    slots: MealSlot[],
    mealCount: number,
  ): Partial<Record<MealSlot, number>> {
    const key = String(Math.min(4, Math.max(2, mealCount)));
    const baseLayout = SLOT_WEIGHTS[key] ?? SLOT_WEIGHTS['3'];
    // Snack may be present even when the base layout for `mealCount` had none —
    // fall back to a small default and renormalise across the active slots.
    const raw: Partial<Record<MealSlot, number>> = {};
    let sum = 0;
    for (const slot of slots) {
      const w = baseLayout[slot] ?? (slot === 'snack' ? 0.12 : 0.3);
      raw[slot] = w;
      sum += w;
    }
    const norm: Partial<Record<MealSlot, number>> = {};
    for (const slot of slots) norm[slot] = (raw[slot] ?? 0) / (sum || 1);
    return norm;
  }

  /** Two simple, preference-aware sample combos for a slot (not a food DB). */
  private suggestions(slot: MealSlot, input: MealPlanInput): string[] {
    const proteins = this.filterProteins(input);
    const carbs = this.pickCarbs(slot, input);
    const fibers = input.fiberPrefs.length ? input.fiberPrefs : ['vegetables'];

    const p1 = PROTEIN_LABEL[proteins[0]] ?? 'Protein source';
    const p2 = PROTEIN_LABEL[proteins[1 % Math.max(1, proteins.length)]] ?? p1;
    const c1 = CARB_LABEL[carbs[0]] ?? 'Whole grains';
    const c2 = CARB_LABEL[carbs[1 % Math.max(1, carbs.length)]] ?? c1;
    const f1 = FIBER_LABEL[fibers[0]] ?? 'Veg';

    if (slot === 'snack') {
      return [`${p1} + ${f1}`, `${p2} shake + fruit`];
    }
    if (slot === 'breakfast') {
      return [`${p1} + ${c1} + ${f1}`, `${p2} + fruit + ${c2}`];
    }
    return [`${p1} + ${c1} + ${f1}`, `${p2} + ${c2} + salad`];
  }

  private filterProteins(input: MealPlanInput): string[] {
    let list = input.proteinPrefs.length
      ? [...input.proteinPrefs]
      : ['dal', 'paneer'];
    const diet = input.dietaryPref;
    const block = new Set<string>();
    if (diet === 'vegetarian') ['fish', 'chicken', 'eggs'].forEach((x) => block.add(x));
    if (diet === 'eggitarian') ['fish', 'chicken'].forEach((x) => block.add(x));
    if (diet === 'vegan')
      ['fish', 'chicken', 'eggs', 'paneer', 'whey'].forEach((x) => block.add(x));
    if (input.allergens.includes('lactose'))
      ['paneer', 'whey'].forEach((x) => block.add(x));
    const filtered = list.filter((p) => !block.has(p));
    list = filtered.length ? filtered : ['dal', 'tofu'];
    return list;
  }

  private pickCarbs(slot: MealSlot, input: MealPlanInput): string[] {
    let list = input.carbPrefs.length ? [...input.carbPrefs] : ['rice', 'oats'];
    if (input.allergens.includes('gluten')) {
      const noGluten = list.filter((c) => c !== 'roti');
      list = noGluten.length ? noGluten : ['rice', 'oats'];
    }
    // Breakfast skews toward oats/fruit-friendly carbs when available.
    if (slot === 'breakfast' && list.includes('oats')) {
      list = ['oats', ...list.filter((c) => c !== 'oats')];
    }
    return list;
  }
}
