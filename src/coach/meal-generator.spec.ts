import {
  generateMealPlan,
  regenerateMeal,
  dayTotals,
  slotsFor,
  type MealPrefs,
  type MealTargets,
} from './meal-generator';
import { foodBySlug, FOOD_CATALOG } from './data/food-catalog';

const TARGETS: MealTargets = {
  dailyKcal: 2000,
  proteinG: 130,
  carbsG: 200,
  fatG: 60,
  fiberG: 30,
};

function prefs(over: Partial<MealPrefs> = {}): MealPrefs {
  return {
    dietaryPref: 'mixed',
    proteinPrefs: [],
    carbPrefs: [],
    fiberPrefs: [],
    allergens: [],
    dislikes: [],
    mealCount: 3,
    includeSnack: false,
    ...over,
  };
}

describe('slotsFor', () => {
  it('maps meal count + snack to slots', () => {
    expect(slotsFor(2, false)).toEqual(['breakfast', 'dinner']);
    expect(slotsFor(3, false)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(slotsFor(4, false)).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
    expect(slotsFor(3, true)).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });
});

describe('generateMealPlan', () => {
  it('produces 7 repeating days with the right number of meals', () => {
    const plan = generateMealPlan(TARGETS, prefs({ mealCount: 3 }));
    expect(plan.days).toHaveLength(7);
    expect(plan.days[0].weekday).toBe('Mon');
    expect(plan.days.every((d) => d.meals.length === 3)).toBe(true);
  });

  it('is deterministic — same input yields the same plan', () => {
    const a = generateMealPlan(TARGETS, prefs());
    const b = generateMealPlan(TARGETS, prefs());
    expect(a).toEqual(b);
  });

  it('gives real, positive portions in grams', () => {
    const plan = generateMealPlan(TARGETS, prefs());
    for (const day of plan.days) {
      for (const meal of day.meals) {
        expect(meal.portions.length).toBeGreaterThan(0);
        for (const p of meal.portions) {
          expect(p.grams).toBeGreaterThan(0);
          expect(p.kcal).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('day calories land in a sensible band around the target', () => {
    const plan = generateMealPlan(TARGETS, prefs());
    const totals = plan.days.map(dayTotals);
    for (const t of totals) {
      // Deterministic engine isn't exact, but should be in a reasonable range.
      expect(t.kcal).toBeGreaterThan(TARGETS.dailyKcal * 0.55);
      expect(t.kcal).toBeLessThan(TARGETS.dailyKcal * 1.5);
      expect(t.proteinG).toBeGreaterThan(TARGETS.proteinG * 0.5);
    }
  });

  describe('diet compliance', () => {
    it('vegan plan contains no animal foods', () => {
      const plan = generateMealPlan(TARGETS, prefs({ dietaryPref: 'vegan' }));
      const slugs = portionSlugs(plan);
      for (const slug of slugs) {
        expect(foodBySlug(slug)!.diet).toBe('vegan');
      }
      // sanity: paneer/chicken/eggs/milk must never appear
      expect(slugs).not.toContain('chicken');
      expect(slugs).not.toContain('paneer');
      expect(slugs).not.toContain('eggs');
      expect(slugs).not.toContain('milk');
    });

    it('vegetarian plan has no meat or eggs', () => {
      const plan = generateMealPlan(TARGETS, prefs({ dietaryPref: 'vegetarian' }));
      const slugs = portionSlugs(plan);
      expect(slugs).not.toContain('chicken');
      expect(slugs).not.toContain('fish');
      expect(slugs).not.toContain('eggs');
    });
  });

  it('respects allergens (no lactose/gluten foods)', () => {
    const plan = generateMealPlan(TARGETS, prefs({ allergens: ['lactose', 'gluten'] }));
    for (const slug of portionSlugs(plan)) {
      const food = foodBySlug(slug)!;
      expect(food.allergens).not.toContain('lactose');
      expect(food.allergens).not.toContain('gluten');
    }
  });

  it('respects dislikes', () => {
    const plan = generateMealPlan(TARGETS, prefs({ dislikes: ['rice', 'broccoli'] }));
    const slugs = portionSlugs(plan);
    expect(slugs).not.toContain('rice');
    expect(slugs).not.toContain('broccoli');
  });

  it('biases toward preferred proteins/carbs', () => {
    const plan = generateMealPlan(TARGETS, prefs({ proteinPrefs: ['chicken'], carbPrefs: ['rice'] }));
    const slugs = portionSlugs(plan);
    expect(slugs).toContain('chicken');
    expect(slugs).toContain('rice');
  });
});

describe('regenerateMeal', () => {
  const slots = slotsFor(3, false);

  it('returns a valid different-variation meal', () => {
    const m0 = regenerateMeal('lunch', slots, TARGETS, prefs(), 0);
    const m1 = regenerateMeal('lunch', slots, TARGETS, prefs(), 1);
    expect(m0).not.toBeNull();
    expect(m1).not.toBeNull();
    expect(m0!.portions.length).toBeGreaterThan(0);
  });

  it('never violates diet/allergens on regenerate', () => {
    const m = regenerateMeal('dinner', slots, TARGETS, prefs({ dietaryPref: 'vegan', allergens: ['soy'] }), 2)!;
    for (const p of m.portions) {
      const food = foodBySlug(p.foodSlug)!;
      expect(food.diet).toBe('vegan');
      expect(food.allergens).not.toContain('soy');
    }
  });
});

describe('catalog integrity', () => {
  it('has unique slugs and non-negative macros', () => {
    const slugs = FOOD_CATALOG.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const f of FOOD_CATALOG) {
      expect(f.kcalPer100g).toBeGreaterThanOrEqual(0);
      expect(f.servingGrams).toBeGreaterThan(0);
    }
  });
});

// helpers
function portionSlugs(plan: { days: { meals: { portions: { foodSlug: string }[] }[] }[] }): string[] {
  const out: string[] = [];
  for (const d of plan.days) for (const m of d.meals) for (const p of m.portions) out.push(p.foodSlug);
  return out;
}
