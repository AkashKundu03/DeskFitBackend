import { Module } from '@nestjs/common';
import { CoachController } from './coach.controller';
import { WorkoutsController } from './workouts.controller';
import { NutritionController } from './nutrition.controller';
import { DemoController } from './demo.controller';
import { CoachService } from './coach.service';
import { NutritionService } from './nutrition.service';
import { WorkoutsService } from './workouts.service';
import { WeeklyPlannerService } from './weekly-planner.service';
import { MealPlannerService } from './meal-planner.service';

/**
 * Deterministic, rule-based coach engine (no AI/LLM). The controllers here stay
 * public and stateless — safe for demos and local development. The engine
 * services (workouts, nutrition, weekly planner, meal planner) are exported so
 * the authenticated PlansModule can persist their deterministic output.
 */
@Module({
  controllers: [
    CoachController,
    WorkoutsController,
    NutritionController,
    DemoController,
  ],
  providers: [
    CoachService,
    NutritionService,
    WorkoutsService,
    WeeklyPlannerService,
    MealPlannerService,
  ],
  exports: [
    NutritionService,
    WorkoutsService,
    WeeklyPlannerService,
    MealPlannerService,
  ],
})
export class CoachModule {}
