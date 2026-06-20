import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

const DIET = ['vegetarian', 'eggitarian', 'nonVegetarian', 'vegan', 'mixed'] as const;
const PROTEIN = ['paneer', 'tofu', 'fish', 'chicken', 'eggs', 'dal', 'whey'] as const;
const CARB = ['rice', 'roti', 'oats', 'potato', 'quinoa', 'mixed'] as const;
const FIBER = ['vegetables', 'fruits', 'salad', 'legumes'] as const;
const ALLERGEN = ['lactose', 'gluten', 'nuts', 'none'] as const;

export class CreateMealPlanDto {
  @IsInt()
  @IsIn([2, 3, 4])
  mealCount: number;

  @IsOptional()
  @IsBoolean()
  includeSnack?: boolean;

  @IsIn(DIET)
  dietaryPref: (typeof DIET)[number];

  @IsArray()
  @IsIn(PROTEIN, { each: true })
  proteinPrefs: (typeof PROTEIN)[number][];

  @IsArray()
  @IsIn(CARB, { each: true })
  carbPrefs: (typeof CARB)[number][];

  @IsArray()
  @IsIn(FIBER, { each: true })
  fiberPrefs: (typeof FIBER)[number][];

  @IsArray()
  @IsIn(ALLERGEN, { each: true })
  allergens: (typeof ALLERGEN)[number][];

  // Daily targets the app already computed via /coach/calculate-targets.
  @IsInt() @Min(800) dailyKcal: number;
  @IsInt() @Min(0) proteinG: number;
  @IsInt() @Min(0) carbsG: number;
  @IsInt() @Min(0) fatG: number;
  @IsInt() @Min(0) fiberG: number;
}
