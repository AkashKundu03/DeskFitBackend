// ─────────────────────────────────────────────────────────────────────────────
// Curated, replaceable food catalog. Per-100g macros are APPROXIMATE and meant
// for educational planning only — NOT medical-grade measurements. Each item
// carries a diet level, allergen tags, a sensible serving size, and a source
// note so values can be audited / swapped later.
//
// `diet` is the minimum diet level that can eat the food:
//   vegan  → everyone can eat
//   veg    → vegetarians, eggitarians, non-veg (dairy etc.)
//   egg    → eggitarians + non-veg
//   nonVeg → non-veg only
// ─────────────────────────────────────────────────────────────────────────────

export type FoodCategory =
  | 'protein'
  | 'carb'
  | 'vegetable'
  | 'fruit'
  | 'fat'
  | 'dairy'
  | 'legume';

export type DietLevel = 'vegan' | 'veg' | 'egg' | 'nonVeg';
export type AllergenTag = 'lactose' | 'gluten' | 'nuts' | 'soy';

export interface FoodItem {
  slug: string;
  name: string;
  category: FoodCategory;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  servingGrams: number; // grams in one natural serving (for "1 piece/cup")
  servingUnit: string; // "g" | "piece" | "cup" | "scoop" | "tbsp"
  diet: DietLevel;
  allergens: AllergenTag[];
  source: string; // provenance note (educational approximation)
}

const SRC = 'approx per 100g (educational)';

export const FOOD_CATALOG: FoodItem[] = [
  // ── Proteins ───────────────────────────────────────────────────────────────
  { slug: 'paneer', name: 'Paneer', category: 'protein', kcalPer100g: 265, proteinPer100g: 18, carbsPer100g: 1.2, fatPer100g: 21, fiberPer100g: 0, servingGrams: 50, servingUnit: 'g', diet: 'veg', allergens: ['lactose'], source: SRC },
  { slug: 'tofu', name: 'Tofu', category: 'protein', kcalPer100g: 76, proteinPer100g: 8, carbsPer100g: 1.9, fatPer100g: 4.8, fiberPer100g: 0.3, servingGrams: 100, servingUnit: 'g', diet: 'vegan', allergens: ['soy'], source: SRC },
  { slug: 'chicken', name: 'Chicken breast', category: 'protein', kcalPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0, servingGrams: 100, servingUnit: 'g', diet: 'nonVeg', allergens: [], source: SRC },
  { slug: 'fish', name: 'Fish (salmon)', category: 'protein', kcalPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, fiberPer100g: 0, servingGrams: 100, servingUnit: 'g', diet: 'nonVeg', allergens: [], source: SRC },
  { slug: 'eggs', name: 'Eggs', category: 'protein', kcalPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, fiberPer100g: 0, servingGrams: 50, servingUnit: 'piece', diet: 'egg', allergens: [], source: SRC },
  { slug: 'whey', name: 'Whey protein', category: 'protein', kcalPer100g: 360, proteinPer100g: 80, carbsPer100g: 8, fatPer100g: 6, fiberPer100g: 0, servingGrams: 30, servingUnit: 'scoop', diet: 'veg', allergens: ['lactose'], source: SRC },
  { slug: 'greek_yogurt', name: 'Greek yogurt', category: 'protein', kcalPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 0, servingGrams: 150, servingUnit: 'cup', diet: 'veg', allergens: ['lactose'], source: SRC },
  { slug: 'soy_chunks', name: 'Soy chunks', category: 'protein', kcalPer100g: 145, proteinPer100g: 14, carbsPer100g: 9, fatPer100g: 1, fiberPer100g: 3, servingGrams: 50, servingUnit: 'g', diet: 'vegan', allergens: ['soy'], source: SRC },
  // ── Legumes (count as plant protein + fiber) ────────────────────────────────
  { slug: 'dal', name: 'Dal (lentils)', category: 'legume', kcalPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, fiberPer100g: 8, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'chickpeas', name: 'Chickpeas', category: 'legume', kcalPer100g: 164, proteinPer100g: 9, carbsPer100g: 27, fatPer100g: 2.6, fiberPer100g: 8, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'rajma', name: 'Rajma (kidney beans)', category: 'legume', kcalPer100g: 127, proteinPer100g: 9, carbsPer100g: 23, fatPer100g: 0.5, fiberPer100g: 7, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  // ── Carbs ───────────────────────────────────────────────────────────────────
  { slug: 'rice', name: 'Rice', category: 'carb', kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'roti', name: 'Roti (wheat)', category: 'carb', kcalPer100g: 265, proteinPer100g: 9, carbsPer100g: 50, fatPer100g: 4, fiberPer100g: 4, servingGrams: 40, servingUnit: 'piece', diet: 'vegan', allergens: ['gluten'], source: SRC },
  { slug: 'oats', name: 'Oats', category: 'carb', kcalPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatPer100g: 7, fiberPer100g: 11, servingGrams: 60, servingUnit: 'cup', diet: 'vegan', allergens: ['gluten'], source: SRC },
  { slug: 'potato', name: 'Potato', category: 'carb', kcalPer100g: 87, proteinPer100g: 1.9, carbsPer100g: 20, fatPer100g: 0.1, fiberPer100g: 1.8, servingGrams: 150, servingUnit: 'g', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'sweet_potato', name: 'Sweet potato', category: 'carb', kcalPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1, fiberPer100g: 3, servingGrams: 150, servingUnit: 'g', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'quinoa', name: 'Quinoa', category: 'carb', kcalPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9, fiberPer100g: 2.8, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'poha', name: 'Poha', category: 'carb', kcalPer100g: 130, proteinPer100g: 2.6, carbsPer100g: 28, fatPer100g: 0.4, fiberPer100g: 1, servingGrams: 120, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  // ── Vegetables ───────────────────────────────────────────────────────────────
  { slug: 'broccoli', name: 'Broccoli', category: 'vegetable', kcalPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4, fiberPer100g: 2.6, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'spinach', name: 'Spinach', category: 'vegetable', kcalPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 2.2, servingGrams: 100, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'mixed_veg', name: 'Mixed vegetables', category: 'vegetable', kcalPer100g: 65, proteinPer100g: 2.6, carbsPer100g: 13, fatPer100g: 0.5, fiberPer100g: 4, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'salad', name: 'Garden salad', category: 'vegetable', kcalPer100g: 17, proteinPer100g: 1.4, carbsPer100g: 3, fatPer100g: 0.2, fiberPer100g: 2, servingGrams: 150, servingUnit: 'bowl', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'green_beans', name: 'Green beans', category: 'vegetable', kcalPer100g: 31, proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.2, fiberPer100g: 3.4, servingGrams: 150, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  // ── Fruit ────────────────────────────────────────────────────────────────────
  { slug: 'banana', name: 'Banana', category: 'fruit', kcalPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6, servingGrams: 120, servingUnit: 'piece', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'apple', name: 'Apple', category: 'fruit', kcalPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, fiberPer100g: 2.4, servingGrams: 150, servingUnit: 'piece', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'berries', name: 'Mixed berries', category: 'fruit', kcalPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14, fatPer100g: 0.3, fiberPer100g: 2.4, servingGrams: 100, servingUnit: 'cup', diet: 'vegan', allergens: [], source: SRC },
  // ── Fats ─────────────────────────────────────────────────────────────────────
  { slug: 'almonds', name: 'Almonds', category: 'fat', kcalPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 49, fiberPer100g: 12, servingGrams: 20, servingUnit: 'handful', diet: 'vegan', allergens: ['nuts'], source: SRC },
  { slug: 'peanut_butter', name: 'Peanut butter', category: 'fat', kcalPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, fiberPer100g: 6, servingGrams: 20, servingUnit: 'tbsp', diet: 'vegan', allergens: ['nuts'], source: SRC },
  { slug: 'olive_oil', name: 'Olive oil', category: 'fat', kcalPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0, servingGrams: 10, servingUnit: 'tbsp', diet: 'vegan', allergens: [], source: SRC },
  { slug: 'ghee', name: 'Ghee', category: 'fat', kcalPer100g: 900, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0, servingGrams: 10, servingUnit: 'tsp', diet: 'veg', allergens: ['lactose'], source: SRC },
  // ── Dairy ────────────────────────────────────────────────────────────────────
  { slug: 'milk', name: 'Milk', category: 'dairy', kcalPer100g: 42, proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 1, fiberPer100g: 0, servingGrams: 200, servingUnit: 'glass', diet: 'veg', allergens: ['lactose'], source: SRC },
];

export function foodBySlug(slug: string): FoodItem | undefined {
  return FOOD_CATALOG.find((f) => f.slug === slug);
}
