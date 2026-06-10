import { Injectable } from '@nestjs/common';
import type { CoachProfileInput, NutritionTargets } from './coach.types';
import {
  ACTIVITY_MULTIPLIER,
  COACH_EXPLANATION,
  FAT_LOSS,
  FAT_PER_KG,
  FIBER_MIN_G,
  FIBER_PER_1000_KCAL,
  GOAL_LABEL,
  KCAL_PER_KG_FAT,
  MIN_FOOD_KCAL,
  MUSCLE_GAIN,
  PROTEIN_PER_KG,
} from './data/nutrition-rules';

const WEEKS_PER_MONTH = 4.345;

@Injectable()
export class NutritionService {
  /** Mifflin–St Jeor BMR (kept internal — never shown as a primary label). */
  private bmr(p: CoachProfileInput): number {
    const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
    if (p.gender === 'male') return base + 5;
    if (p.gender === 'female') return base - 161;
    return base - 78;
  }

  private tdee(p: CoachProfileInput): { bmr: number; tdee: number; mult: number } {
    const bmr = this.bmr(p);
    const mult = ACTIVITY_MULTIPLIER[p.activityLevel] ?? 1.2;
    return { bmr, tdee: bmr * mult, mult };
  }

  /**
   * Deterministic, safety-guarded nutrition targets. The heart of the fat-loss
   * fix: compute a realistic deficit, clamp it to safe limits, and flag overly
   * aggressive goals with a safer timeline instead of recommending a crash diet.
   */
  calculateTargets(p: CoachProfileInput): NutritionTargets {
    const { bmr, tdee, mult } = this.tdee(p);
    const dailyBurn = Math.round(tdee);
    const minFood = MIN_FOOD_KCAL[p.gender] ?? MIN_FOOD_KCAL.other;

    let foodTarget = dailyBurn;
    let deficit = 0;
    let isAggressive = false;
    let safetyMessage: string | null = null;
    let saferTimelineMonths: number | null = null;

    if (p.goal === 'fatLoss') {
      const kgToLose = Math.max(0, p.weightKg - p.targetWeightKg);
      const months = p.timelineMonths && p.timelineMonths > 0 ? p.timelineMonths : 4;
      const weeks = Math.max(1, months * WEEKS_PER_MONTH);

      // What the user's chosen timeline *demands*.
      const desiredWeeklyKg = kgToLose / weeks;
      const desiredDailyDeficit = (desiredWeeklyKg * KCAL_PER_KG_FAT) / 7;

      // Safety ceilings.
      const safeWeeklyKg = Math.min(
        FAT_LOSS.safeWeeklyFraction * p.weightKg,
        FAT_LOSS.maxWeeklyKg,
      );
      const maxDeficitByRate = (safeWeeklyKg * KCAL_PER_KG_FAT) / 7;
      // Never eat below 90% of BMR, and never below the absolute floor — this is
      // the "no crash diet" guardrail.
      const foodFloor = Math.max(minFood, bmr * 0.9);
      const maxDeficitByFloor = dailyBurn - foodFloor;
      const maxDeficitByFraction = dailyBurn * FAT_LOSS.maxDeficitFraction;

      const allowedDeficit = Math.max(
        0,
        Math.min(
          desiredDailyDeficit,
          maxDeficitByRate,
          maxDeficitByFloor,
          maxDeficitByFraction,
        ),
      );

      // Aggressive if the chosen timeline needs a bigger deficit than we'll
      // safely allow. The "safer timeline" reflects the pace the SAFE plan
      // actually delivers, so the number matches the food target we recommend.
      isAggressive = desiredDailyDeficit > allowedDeficit + 30;
      deficit = Math.round(allowedDeficit);
      foodTarget = Math.round(dailyBurn - allowedDeficit);

      const achievableWeeklyKg = (allowedDeficit * 7) / KCAL_PER_KG_FAT;
      if (isAggressive && achievableWeeklyKg > 0) {
        saferTimelineMonths = Math.ceil(
          kgToLose / achievableWeeklyKg / WEEKS_PER_MONTH,
        );
        safetyMessage =
          `This goal may be too aggressive to do safely. A more sustainable ` +
          `timeline would be around ${saferTimelineMonths} months — your plan ` +
          `is set to that safer pace so you keep your energy and muscle.`;
      }
    } else if (p.goal === 'muscleGain') {
      deficit = -MUSCLE_GAIN.surplusKcal; // negative deficit = surplus
      foodTarget = dailyBurn + MUSCLE_GAIN.surplusKcal;
    } else {
      // maintenance
      deficit = 0;
      foodTarget = dailyBurn;
    }

    // Never below the absolute floor.
    if (foodTarget < minFood) {
      foodTarget = minFood;
      deficit = dailyBurn - foodTarget;
    }

    const macros = this.macros(p, foodTarget);

    return {
      goal: p.goal,
      goalLabel: GOAL_LABEL[p.goal],
      dailyBurnKcal: dailyBurn,
      foodTargetKcal: foodTarget,
      deficitKcal: deficit,
      ...macros,
      coachExplanation: COACH_EXPLANATION[p.goal],
      safety: {
        isAggressive,
        message: safetyMessage,
        saferTimelineMonths,
      },
      howCalculated: {
        bmr: Math.round(bmr),
        tdee: dailyBurn,
        activityMultiplier: mult,
        method: 'Mifflin–St Jeor BMR × activity, with sustainable deficit guardrails',
      },
    };
  }

  private macros(p: CoachProfileInput, foodTargetKcal: number) {
    const proteinG = Math.round(PROTEIN_PER_KG[p.goal] * p.weightKg);
    const fatG = Math.round(FAT_PER_KG * p.weightKg);
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const carbsKcal = Math.max(0, foodTargetKcal - proteinKcal - fatKcal);
    const carbsG = Math.round(carbsKcal / 4);
    const fiberG = Math.max(
      FIBER_MIN_G,
      Math.round((foodTargetKcal / 1000) * FIBER_PER_1000_KCAL),
    );
    return { proteinG, carbsG, fatG, fiberG };
  }
}
