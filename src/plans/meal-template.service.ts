import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateMealPlan,
  regenerateMeal,
  slotsFor,
  type GeneratedMeal,
  type MealPrefs,
  type MealTargets,
} from '../coach/meal-generator';
import { FOOD_CATALOG, foodBySlug } from '../coach/data/food-catalog';
import { mondayOfISO, serverTodayISO } from '../coach/week';
import { weekdayIndex } from '../coach/planner.types';
import { CreateMealTemplateDto, EditPortionDto } from './dto/meal-template.dto';

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const WEEKLY_SWAP_LIMIT = 5;

@Injectable()
export class MealTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seed the FoodItem catalog once (idempotent). */
  private async ensureCatalog() {
    const count = await this.prisma.foodItem.count();
    if (count > 0) return;
    await this.prisma.foodItem.createMany({
      data: FOOD_CATALOG.map((f) => ({
        slug: f.slug,
        name: f.name,
        category: f.category,
        kcalPer100g: f.kcalPer100g,
        proteinPer100g: f.proteinPer100g,
        carbsPer100g: f.carbsPer100g,
        fatPer100g: f.fatPer100g,
        fiberPer100g: f.fiberPer100g,
        servingGrams: f.servingGrams,
        servingUnit: f.servingUnit,
        diet: f.diet,
        allergens: f.allergens as unknown as Prisma.InputJsonValue,
        source: f.source,
      })),
      skipDuplicates: true,
    });
  }

  getCatalog() {
    return FOOD_CATALOG;
  }

  /** Create (or replace) the user's repeating weekly meal template. */
  async createWeeklyPlan(userId: string, dto: CreateMealTemplateDto) {
    await this.ensureCatalog();

    const targets: MealTargets = {
      dailyKcal: dto.dailyKcal,
      proteinG: dto.proteinG,
      carbsG: dto.carbsG,
      fatG: dto.fatG,
      fiberG: dto.fiberG,
    };
    const prefs = this.toPrefs(dto);
    const generated = generateMealPlan(targets, prefs);

    const plan = await this.prisma.$transaction(async (tx) => {
      await tx.weeklyMealPlan.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
      return tx.weeklyMealPlan.create({
        data: {
          userId,
          active: true,
          mealCount: dto.mealCount,
          includeSnack: dto.includeSnack ?? false,
          dietaryPref: dto.dietaryPref,
          proteinPrefs: (dto.proteinPrefs ?? []) as Prisma.InputJsonValue,
          carbPrefs: (dto.carbPrefs ?? []) as Prisma.InputJsonValue,
          fiberPrefs: (dto.fiberPrefs ?? []) as Prisma.InputJsonValue,
          allergens: (dto.allergens ?? []) as Prisma.InputJsonValue,
          dislikes: (dto.dislikes ?? []) as Prisma.InputJsonValue,
          dailyKcal: dto.dailyKcal,
          proteinG: dto.proteinG,
          carbsG: dto.carbsG,
          fatG: dto.fatG,
          fiberG: dto.fiberG,
          days: {
            create: generated.days.map((day) => ({
              weekday: day.weekday,
              meals: {
                create: day.meals.map((m) => this.mealCreate(m)),
              },
            })),
          },
        },
      });
    });

    return this.getCurrent(userId, dto.date);
  }

  /** The active weekly plan with days/meals/portions + remaining swaps. */
  async getCurrent(userId: string, todayISO: string = serverTodayISO()) {
    const plan = await this.prisma.weeklyMealPlan.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
      include: { days: { include: { meals: { include: { portions: true } } } } },
    });
    if (!plan) return null;
    return this.toDTO(plan, await this.remainingSwaps(userId, todayISO));
  }

  /** Mark a meal completed/skipped for the current week. */
  async setMealStatus(userId: string, mealId: string, status: string) {
    const meal = await this.ownedMeal(userId, mealId);
    await this.prisma.meal.update({ where: { id: meal.id }, data: { status } });
    return this.getCurrent(userId);
  }

  /**
   * Regenerate ONE meal, enforcing the 5-successful-swaps-per-week quota.
   * A failed generation never consumes quota.
   */
  async regenerateMeal(userId: string, mealId: string, todayISO: string = serverTodayISO()) {
    const meal = await this.ownedMeal(userId, mealId);
    const day = await this.prisma.mealPlanDay.findUnique({ where: { id: meal.dayId } });
    const plan = day
      ? await this.prisma.weeklyMealPlan.findFirst({ where: { id: day.planId, userId } })
      : null;
    if (!day || !plan) throw new NotFoundException('Meal plan not found');

    const weekKey = mondayOfISO(todayISO);
    const used = await this.prisma.mealRegenerationEvent.count({
      where: { userId, weekKey, success: true },
    });
    if (used >= WEEKLY_SWAP_LIMIT) {
      throw new ConflictException(
        `You've used all ${WEEKLY_SWAP_LIMIT} meal swaps this week. Resets next week.`,
      );
    }

    const targets: MealTargets = {
      dailyKcal: plan.dailyKcal,
      proteinG: plan.proteinG,
      carbsG: plan.carbsG,
      fatG: plan.fatG,
      fiberG: plan.fiberG,
    };
    const slots = slotsFor(plan.mealCount, plan.includeSnack);
    const newMeal = regenerateMeal(meal.slot, slots, targets, this.planPrefs(plan), meal.version);

    if (!newMeal) {
      // Failed attempt → record but do NOT consume quota (we count only successes).
      await this.prisma.mealRegenerationEvent.create({
        data: { userId, planId: plan.id, mealId, weekKey, success: false, reason: 'no valid swap' },
      });
      throw new BadRequestException('Could not find a valid swap for this meal.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mealFoodPortion.deleteMany({ where: { mealId } });
      await tx.meal.update({
        where: { id: mealId },
        data: {
          name: newMeal.name,
          kcal: newMeal.kcal,
          proteinG: newMeal.proteinG,
          carbsG: newMeal.carbsG,
          fatG: newMeal.fatG,
          fiberG: newMeal.fiberG,
          status: 'planned',
          version: meal.version + 1,
          portions: { create: newMeal.portions.map((p) => this.portionCreate(p)) },
        },
      });
      await tx.mealRegenerationEvent.create({
        data: { userId, planId: plan.id, mealId, weekKey, success: true },
      });
    });

    return this.getCurrent(userId, todayISO);
  }

  /**
   * "Build your thali" — change a portion's grams and/or swap its food, then
   * recompute the portion + meal totals. Manual edit; never consumes swap quota.
   */
  async editPortion(userId: string, dto: EditPortionDto, todayISO: string = serverTodayISO()) {
    const portion = await this.prisma.mealFoodPortion.findUnique({ where: { id: dto.portionId } });
    if (!portion) throw new NotFoundException('Portion not found');
    const meal = await this.ownedMeal(userId, portion.mealId);
    const plan = await this.planForMeal(userId, meal.id);

    const slug = dto.foodSlug ?? portion.foodSlug;
    const food = foodBySlug(slug);
    if (!food) throw new BadRequestException('Unknown food.');
    // Respect the user's diet + allergens even on a manual swap.
    const allergens = this.asArr(plan.allergens);
    if (food.allergens.some((a) => allergens.includes(a))) {
      throw new BadRequestException(`${food.name} contains an allergen you avoid.`);
    }

    const grams = Math.max(5, Math.min(500, dto.grams ?? portion.grams));
    const f = grams / 100;
    await this.prisma.$transaction(async (tx) => {
      await tx.mealFoodPortion.update({
        where: { id: portion.id },
        data: {
          foodSlug: slug,
          name: food.name,
          grams,
          kcal: Math.round(food.kcalPer100g * f),
          proteinG: Math.round(food.proteinPer100g * f * 10) / 10,
          carbsG: Math.round(food.carbsPer100g * f * 10) / 10,
          fatG: Math.round(food.fatPer100g * f * 10) / 10,
          fiberG: Math.round(food.fiberPer100g * f * 10) / 10,
        },
      });
      await this.recomputeMeal(tx, meal.id);
    });

    return this.getCurrent(userId, todayISO);
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async recomputeMeal(tx: Prisma.TransactionClient, mealId: string) {
    const portions = await tx.mealFoodPortion.findMany({ where: { mealId } });
    const t = portions.reduce(
      (a, p) => ({
        kcal: a.kcal + p.kcal,
        proteinG: a.proteinG + p.proteinG,
        carbsG: a.carbsG + p.carbsG,
        fatG: a.fatG + p.fatG,
        fiberG: a.fiberG + p.fiberG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
    );
    await tx.meal.update({
      where: { id: mealId },
      data: {
        name: portions.map((p) => p.name).join(' + '),
        kcal: Math.round(t.kcal),
        proteinG: Math.round(t.proteinG),
        carbsG: Math.round(t.carbsG),
        fatG: Math.round(t.fatG),
        fiberG: Math.round(t.fiberG),
      },
    });
  }

  private async remainingSwaps(userId: string, todayISO: string): Promise<number> {
    const used = await this.prisma.mealRegenerationEvent.count({
      where: { userId, weekKey: mondayOfISO(todayISO), success: true },
    });
    return Math.max(0, WEEKLY_SWAP_LIMIT - used);
  }

  private async ownedMeal(userId: string, mealId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: { day: { include: { plan: true } } },
    });
    if (!meal || meal.day.plan.userId !== userId) {
      throw new NotFoundException('Meal not found');
    }
    return meal;
  }

  private async planForMeal(userId: string, mealId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: { day: { include: { plan: true } } },
    });
    if (!meal || meal.day.plan.userId !== userId) throw new NotFoundException('Plan not found');
    return meal.day.plan;
  }

  private toPrefs(dto: CreateMealTemplateDto): MealPrefs {
    return {
      dietaryPref: dto.dietaryPref,
      proteinPrefs: dto.proteinPrefs ?? [],
      carbPrefs: dto.carbPrefs ?? [],
      fiberPrefs: dto.fiberPrefs ?? [],
      allergens: dto.allergens ?? [],
      dislikes: dto.dislikes ?? [],
      mealCount: dto.mealCount,
      includeSnack: dto.includeSnack ?? false,
    };
  }

  private planPrefs(plan: {
    dietaryPref: string;
    proteinPrefs: Prisma.JsonValue;
    carbPrefs: Prisma.JsonValue;
    fiberPrefs: Prisma.JsonValue;
    allergens: Prisma.JsonValue;
    dislikes: Prisma.JsonValue;
    mealCount: number;
    includeSnack: boolean;
  }): MealPrefs {
    return {
      dietaryPref: plan.dietaryPref,
      proteinPrefs: this.asArr(plan.proteinPrefs),
      carbPrefs: this.asArr(plan.carbPrefs),
      fiberPrefs: this.asArr(plan.fiberPrefs),
      allergens: this.asArr(plan.allergens),
      dislikes: this.asArr(plan.dislikes),
      mealCount: plan.mealCount,
      includeSnack: plan.includeSnack,
    };
  }

  private mealCreate(m: GeneratedMeal): Prisma.MealCreateWithoutDayInput {
    return {
      slot: m.slot,
      name: m.name,
      kcal: m.kcal,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      fiberG: m.fiberG,
      status: 'planned',
      version: 1,
      portions: { create: m.portions.map((p) => this.portionCreate(p)) },
    };
  }

  private portionCreate(p: GeneratedMeal['portions'][number]) {
    return {
      foodSlug: p.foodSlug,
      name: p.name,
      grams: p.grams,
      kcal: p.kcal,
      proteinG: p.proteinG,
      carbsG: p.carbsG,
      fatG: p.fatG,
      fiberG: p.fiberG,
    };
  }

  private asArr(v: Prisma.JsonValue): string[] {
    return Array.isArray(v) ? v.map(String) : [];
  }

  private toDTO(
    plan: Prisma.WeeklyMealPlanGetPayload<{
      include: { days: { include: { meals: { include: { portions: true } } } } };
    }>,
    remainingSwaps: number,
  ) {
    const days = [...plan.days]
      .sort((a, b) => weekdayIndex(a.weekday) - weekdayIndex(b.weekday))
      .map((d) => ({
        id: d.id,
        weekday: d.weekday,
        meals: [...d.meals]
          .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
          .map((m) => ({
            id: m.id,
            slot: m.slot,
            name: m.name,
            kcal: m.kcal,
            proteinG: m.proteinG,
            carbsG: m.carbsG,
            fatG: m.fatG,
            fiberG: m.fiberG,
            status: m.status,
            version: m.version,
            portions: m.portions.map((p) => ({
              id: p.id,
              foodSlug: p.foodSlug,
              name: p.name,
              grams: p.grams,
              kcal: p.kcal,
              proteinG: p.proteinG,
              carbsG: p.carbsG,
              fatG: p.fatG,
              fiberG: p.fiberG,
            })),
          })),
      }));

    return {
      id: plan.id,
      active: plan.active,
      mealCount: plan.mealCount,
      includeSnack: plan.includeSnack,
      dietaryPref: plan.dietaryPref,
      proteinPrefs: this.asArr(plan.proteinPrefs),
      carbPrefs: this.asArr(plan.carbPrefs),
      fiberPrefs: this.asArr(plan.fiberPrefs),
      allergens: this.asArr(plan.allergens),
      dislikes: this.asArr(plan.dislikes),
      dailyKcal: plan.dailyKcal,
      proteinG: plan.proteinG,
      carbsG: plan.carbsG,
      fatG: plan.fatG,
      fiberG: plan.fiberG,
      remainingSwaps,
      swapLimit: WEEKLY_SWAP_LIMIT,
      days,
    };
  }
}
