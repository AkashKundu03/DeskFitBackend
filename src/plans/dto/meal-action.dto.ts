import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Complete / skip act on a single meal by id. */
export class MealActionDto {
  @IsString()
  mealId: string;
}

/** Adjust regenerates the meal-target split from new daily targets / layout. */
export class AdjustMealPlanDto {
  @IsOptional() @IsInt() @IsIn([2, 3, 4]) mealCount?: number;
  @IsOptional() @IsBoolean() includeSnack?: boolean;
  @IsOptional() @IsInt() @Min(800) dailyKcal?: number;
  @IsOptional() @IsInt() @Min(0) proteinG?: number;
  @IsOptional() @IsInt() @Min(0) carbsG?: number;
  @IsOptional() @IsInt() @Min(0) fatG?: number;
  @IsOptional() @IsInt() @Min(0) fiberG?: number;
}
