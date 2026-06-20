import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MealPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MealPlannerService } from '../coach/meal-planner.service';
import type {
  MealPlanResult,
  MealStatus,
  MealTarget,
} from '../coach/planner.types';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { AdjustMealPlanDto } from './dto/meal-action.dto';

@Injectable()
export class MealPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planner: MealPlannerService,
  ) {}

  /** Build the meal-wise target split and persist it (one plan per user). */
  async createMealPlan(
    userId: string,
    dto: CreateMealPlanDto,
  ): Promise<MealPlanResult> {
    const result = this.planner.build({
      dailyKcal: dto.dailyKcal,
      proteinG: dto.proteinG,
      carbsG: dto.carbsG,
      fatG: dto.fatG,
      fiberG: dto.fiberG,
      mealCount: dto.mealCount,
      includeSnack: dto.includeSnack,
      dietaryPref: dto.dietaryPref,
      proteinPrefs: dto.proteinPrefs,
      carbPrefs: dto.carbPrefs,
      fiberPrefs: dto.fiberPrefs,
      allergens: dto.allergens,
    });

    const row = await this.prisma.mealPlan.upsert({
      where: { userId },
      create: { userId, ...this.toRow(dto, result) },
      update: this.toRow(dto, result),
    });
    return this.toResult(row);
  }

  async getToday(userId: string): Promise<MealPlanResult | null> {
    const row = await this.prisma.mealPlan.findUnique({ where: { userId } });
    return row ? this.toResult(row) : null;
  }

  async completeMeal(userId: string, mealId: string) {
    return this.setMealStatus(userId, mealId, 'completed');
  }

  async skipMeal(userId: string, mealId: string) {
    return this.setMealStatus(userId, mealId, 'skipped');
  }

  /** Rebuild the split from adjusted targets/layout, keeping saved preferences. */
  async adjust(
    userId: string,
    dto: AdjustMealPlanDto,
  ): Promise<MealPlanResult> {
    const row = await this.prisma.mealPlan.findUnique({ where: { userId } });
    if (!row) throw new NotFoundException('No meal plan to adjust');

    const result = this.planner.build({
      dailyKcal: dto.dailyKcal ?? row.dailyKcal,
      proteinG: dto.proteinG ?? row.proteinG,
      carbsG: dto.carbsG ?? row.carbsG,
      fatG: dto.fatG ?? row.fatG,
      fiberG: dto.fiberG ?? row.fiberG,
      mealCount: dto.mealCount ?? row.mealCount,
      includeSnack: dto.includeSnack,
      dietaryPref: row.dietaryPref,
      proteinPrefs: this.asStringArray(row.proteinPrefs),
      carbPrefs: this.asStringArray(row.carbPrefs),
      fiberPrefs: this.asStringArray(row.fiberPrefs),
      allergens: this.asStringArray(row.allergens),
    });

    const updated = await this.prisma.mealPlan.update({
      where: { userId },
      data: {
        mealCount: result.mealCount,
        dailyKcal: result.dailyKcal,
        proteinG: result.proteinG,
        carbsG: result.carbsG,
        fatG: result.fatG,
        fiberG: result.fiberG,
        meals: result.meals as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toResult(updated);
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async setMealStatus(
    userId: string,
    mealId: string,
    status: MealStatus,
  ): Promise<MealPlanResult> {
    const row = await this.prisma.mealPlan.findUnique({ where: { userId } });
    if (!row) throw new NotFoundException('No meal plan found');
    const meals = this.asMeals(row.meals).map((m) =>
      m.id === mealId ? { ...m, status } : m,
    );
    const updated = await this.prisma.mealPlan.update({
      where: { userId },
      data: { meals: meals as unknown as Prisma.InputJsonValue },
    });
    return this.toResult(updated);
  }

  private toRow(dto: CreateMealPlanDto, result: MealPlanResult) {
    return {
      mealCount: result.mealCount,
      dietaryPref: dto.dietaryPref,
      proteinPrefs: dto.proteinPrefs as Prisma.InputJsonValue,
      carbPrefs: dto.carbPrefs as Prisma.InputJsonValue,
      fiberPrefs: dto.fiberPrefs as Prisma.InputJsonValue,
      allergens: dto.allergens as Prisma.InputJsonValue,
      dailyKcal: result.dailyKcal,
      proteinG: result.proteinG,
      carbsG: result.carbsG,
      fatG: result.fatG,
      fiberG: result.fiberG,
      meals: result.meals as unknown as Prisma.InputJsonValue,
    };
  }

  private toResult(row: MealPlan): MealPlanResult {
    return {
      id: row.id,
      mealCount: row.mealCount,
      dietaryPref: row.dietaryPref,
      proteinPrefs: this.asStringArray(row.proteinPrefs),
      carbPrefs: this.asStringArray(row.carbPrefs),
      fiberPrefs: this.asStringArray(row.fiberPrefs),
      allergens: this.asStringArray(row.allergens),
      dailyKcal: row.dailyKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fiberG: row.fiberG,
      meals: this.asMeals(row.meals),
      coachNote:
        'These are targets, not rules. Hit the protein number first, keep meals ' +
        'roughly to these sizes, and the day takes care of itself.',
    };
  }

  private asMeals(value: Prisma.JsonValue): MealTarget[] {
    return Array.isArray(value) ? (value as unknown as MealTarget[]) : [];
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  }
}
