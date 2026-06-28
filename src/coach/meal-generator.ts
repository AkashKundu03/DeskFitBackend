// ─────────────────────────────────────────────────────────────────────────────
// Deterministic 7-day repeating meal generator. Same input → same plan. Produces
// real portions (e.g. rice 150g, chicken 180g) that approximate the day's macro
// targets while respecting diet, allergens and dislikes. No AI — the same
// interface will later support an AI engine behind a flag.
// ─────────────────────────────────────────────────────────────────────────────

import {
  FOOD_CATALOG,
  foodBySlug,
  type AllergenTag,
  type DietLevel,
  type FoodItem,
} from './data/food-catalog';
import { WEEKDAYS } from './planner.types';

export interface MealTargets {
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface MealPrefs {
  dietaryPref: string; // vegan | vegetarian | eggitarian | nonVegetarian | mixed
  proteinPrefs: string[];
  carbPrefs: string[];
  fiberPrefs: string[];
  allergens: string[]; // lactose | gluten | nuts | soy
  dislikes: string[]; // food slugs or names
  mealCount: number; // 2..4
  includeSnack: boolean;
}

export interface GeneratedPortion {
  foodSlug: string;
  name: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface GeneratedMeal {
  slot: string; // breakfast | lunch | dinner | snack
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  portions: GeneratedPortion[];
}

export interface GeneratedDay {
  weekday: string;
  meals: GeneratedMeal[];
}

export interface GeneratedMealPlan {
  days: GeneratedDay[];
}

const DIET_RANK: Record<DietLevel, number> = { vegan: 0, veg: 1, egg: 2, nonVeg: 3 };

function userDietRank(pref: string): number {
  switch (pref) {
    case 'vegan': return 0;
    case 'vegetarian': return 1;
    case 'eggitarian': return 2;
    default: return 3; // nonVegetarian | mixed
  }
}

/** Slots for a given meal count (+ optional snack). */
export function slotsFor(mealCount: number, includeSnack: boolean): string[] {
  const base =
    mealCount <= 2
      ? ['breakfast', 'dinner']
      : mealCount === 3
        ? ['breakfast', 'lunch', 'dinner']
        : ['breakfast', 'lunch', 'dinner', 'snack'];
  if (includeSnack && !base.includes('snack')) base.push('snack');
  return base;
}

/** Fraction of the daily target each slot should carry (normalized). */
function slotFraction(slot: string, slots: string[]): number {
  const weights: Record<string, number> = {
    breakfast: 0.28,
    lunch: 0.34,
    dinner: 0.30,
    snack: 0.12,
  };
  const total = slots.reduce((s, x) => s + (weights[x] ?? 0.25), 0);
  return (weights[slot] ?? 0.25) / total;
}

function isAllowed(food: FoodItem, prefs: MealPrefs, dietRank: number): boolean {
  if (DIET_RANK[food.diet] > dietRank) return false;
  const allergens = prefs.allergens as AllergenTag[];
  if (food.allergens.some((a) => allergens.includes(a))) return false;
  const dislikes = prefs.dislikes.map((d) => d.toLowerCase());
  if (dislikes.includes(food.slug) || dislikes.includes(food.name.toLowerCase())) return false;
  return true;
}

/** Available foods in a category, preferred slugs first (stable order). */
function pool(category: string, preferred: string[], avail: FoodItem[]): FoodItem[] {
  const inCat = avail.filter((f) => f.category === category);
  const pref = inCat.filter((f) => preferred.includes(f.slug));
  const rest = inCat.filter((f) => !preferred.includes(f.slug));
  return [...pref, ...rest];
}

function round(n: number, step = 5): number {
  return Math.max(step, Math.round(n / step) * step);
}

function portion(food: FoodItem, grams: number): GeneratedPortion {
  const f = grams / 100;
  return {
    foodSlug: food.slug,
    name: food.name,
    grams,
    kcal: Math.round(food.kcalPer100g * f),
    proteinG: Math.round(food.proteinPer100g * f * 10) / 10,
    carbsG: Math.round(food.carbsPer100g * f * 10) / 10,
    fatG: Math.round(food.fatPer100g * f * 10) / 10,
    fiberG: Math.round(food.fiberPer100g * f * 10) / 10,
  };
}

function sumMeal(slot: string, portions: GeneratedPortion[]): GeneratedMeal {
  const acc = portions.reduce(
    (a, p) => ({
      kcal: a.kcal + p.kcal,
      proteinG: a.proteinG + p.proteinG,
      carbsG: a.carbsG + p.carbsG,
      fatG: a.fatG + p.fatG,
      fiberG: a.fiberG + p.fiberG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
  const name = portions.map((p) => p.name).join(' + ');
  return {
    slot,
    name,
    kcal: Math.round(acc.kcal),
    proteinG: Math.round(acc.proteinG),
    carbsG: Math.round(acc.carbsG),
    fatG: Math.round(acc.fatG),
    fiberG: Math.round(acc.fiberG),
    portions,
  };
}

/** Pick the i-th item from a pool, wrapping; fall back to `fallback` pool. */
function pick(p: FoodItem[], i: number, fallback: FoodItem[]): FoodItem | undefined {
  const src = p.length > 0 ? p : fallback;
  return src.length > 0 ? src[i % src.length] : undefined;
}

export function generateMealPlan(targets: MealTargets, prefs: MealPrefs): GeneratedMealPlan {
  const dietRank = userDietRank(prefs.dietaryPref);
  const avail = FOOD_CATALOG.filter((f) => isAllowed(f, prefs, dietRank));

  const proteins = pool('protein', prefs.proteinPrefs, avail);
  const legumes = avail.filter((f) => f.category === 'legume');
  const proteinSources = [...proteins, ...legumes];
  const carbs = pool('carb', prefs.carbPrefs, avail);
  const veg = avail.filter((f) => f.category === 'vegetable');
  const fruit = avail.filter((f) => f.category === 'fruit');

  const slots = slotsFor(prefs.mealCount, prefs.includeSnack);

  const days: GeneratedDay[] = WEEKDAYS.map((weekday, dayIdx) => {
    const meals = slots.map((slot, slotIdx) => {
      const seed = dayIdx * slots.length + slotIdx;
      const frac = slotFraction(slot, slots);
      const slotProtein = targets.proteinG * frac;
      const slotCarbs = targets.carbsG * frac;
      const portions: GeneratedPortion[] = [];

      if (slot === 'snack') {
        // Snack: a protein-ish + a fruit.
        const p = pick(proteinSources, seed, avail);
        const fr = pick(fruit, seed, avail);
        if (p) {
          const grams = round((slotProtein / (p.proteinPer100g || 8)) * 100, 10);
          portions.push(portion(p, Math.min(grams, 150)));
        }
        if (fr) portions.push(portion(fr, fr.servingGrams));
      } else {
        const p = pick(proteinSources, seed, avail);
        const c = pick(carbs, seed, avail);
        const v = pick(veg, seed, fruit);
        if (p) {
          const grams = round((slotProtein / (p.proteinPer100g || 10)) * 100, 5);
          portions.push(portion(p, Math.min(Math.max(grams, 40), 300)));
        }
        if (c) {
          const grams = round((slotCarbs / (c.carbsPer100g || 25)) * 100, 5);
          portions.push(portion(c, Math.min(Math.max(grams, 30), 300)));
        }
        if (v) portions.push(portion(v, v.servingGrams));
      }

      // Guarantee at least one portion.
      if (portions.length === 0 && avail.length > 0) {
        portions.push(portion(avail[seed % avail.length], 100));
      }
      return sumMeal(slot, portions);
    });
    return { weekday, meals };
  });

  return { days };
}

/** Day totals for a generated day (used in tests / summaries). */
export function dayTotals(day: GeneratedDay) {
  return day.meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      proteinG: a.proteinG + m.proteinG,
      carbsG: a.carbsG + m.carbsG,
      fatG: a.fatG + m.fatG,
      fiberG: a.fiberG + m.fiberG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

/**
 * Regenerate ONE meal deterministically with a variation offset, validating the
 * result against diet / allergens / dislikes. Returns null if no valid swap
 * exists (so a failed attempt never consumes the user's weekly quota).
 */
export function regenerateMeal(
  slot: string,
  slots: string[],
  targets: MealTargets,
  prefs: MealPrefs,
  variation: number,
): GeneratedMeal | null {
  const dietRank = userDietRank(prefs.dietaryPref);
  const avail = FOOD_CATALOG.filter((f) => isAllowed(f, prefs, dietRank));
  if (avail.length === 0) return null;

  const proteins = pool('protein', prefs.proteinPrefs, avail);
  const legumes = avail.filter((f) => f.category === 'legume');
  const proteinSources = [...proteins, ...legumes];
  const carbs = pool('carb', prefs.carbPrefs, avail);
  const veg = avail.filter((f) => f.category === 'vegetable');
  const fruit = avail.filter((f) => f.category === 'fruit');

  const slotIdx = Math.max(0, slots.indexOf(slot));
  const seed = slotIdx + variation + 1; // offset → a different combo than current
  const frac = slotFraction(slot, slots);
  const slotProtein = targets.proteinG * frac;
  const slotCarbs = targets.carbsG * frac;
  const portions: GeneratedPortion[] = [];

  const p = pick(proteinSources, seed, avail);
  const c = pick(carbs, seed, avail);
  const v = pick(veg, seed, fruit);
  if (p) {
    const grams = round((slotProtein / (p.proteinPer100g || 10)) * 100, 5);
    portions.push(portion(p, Math.min(Math.max(grams, 40), 300)));
  }
  if (c && slot !== 'snack') {
    const grams = round((slotCarbs / (c.carbsPer100g || 25)) * 100, 5);
    portions.push(portion(c, Math.min(Math.max(grams, 30), 300)));
  }
  if (v) portions.push(portion(v, v.servingGrams));
  if (portions.length === 0) return null;

  // Validate against constraints (defensive — pool was already filtered).
  for (const item of portions) {
    const food = foodBySlug(item.foodSlug);
    if (!food || !isAllowed(food, prefs, dietRank)) return null;
  }
  return sumMeal(slot, portions);
}
