import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Wizard answers → a repeating weekly meal template. */
export class CreateMealTemplateDto {
  @IsInt()
  @IsIn([2, 3, 4])
  mealCount: number;

  @IsOptional()
  @IsBoolean()
  includeSnack?: boolean;

  @IsIn(['vegan', 'vegetarian', 'eggitarian', 'nonVegetarian', 'mixed'])
  dietaryPref: string;

  @IsOptional() @IsArray() @IsString({ each: true }) proteinPrefs?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) carbPrefs?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) fiberPrefs?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) allergens?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) dislikes?: string[];

  @IsInt() dailyKcal: number;
  @IsInt() proteinG: number;
  @IsInt() carbsG: number;
  @IsInt() fatG: number;
  @IsInt() fiberG: number;

  @IsOptional() @Matches(ISO_DATE, { message: 'date must be yyyy-mm-dd' }) date?: string;
}

/** Regenerate one meal (subject to the weekly quota). */
export class RegenerateMealDto {
  @IsString() mealId: string;
  @IsOptional() @Matches(ISO_DATE) date?: string;
}

export class MealActionDto {
  @IsString() mealId: string;
}

/** "Build your thali" — change a portion's grams and/or swap its food. */
export class EditPortionDto {
  @IsString() portionId: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(500)
  grams?: number;

  @IsOptional()
  @IsString()
  foodSlug?: string;
}
