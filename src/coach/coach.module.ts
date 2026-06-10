import { Module } from '@nestjs/common';
import { CoachController } from './coach.controller';
import { WorkoutsController } from './workouts.controller';
import { NutritionController } from './nutrition.controller';
import { DemoController } from './demo.controller';
import { CoachService } from './coach.service';
import { NutritionService } from './nutrition.service';
import { WorkoutsService } from './workouts.service';

/**
 * Deterministic, rule-based coach engine (no AI/LLM, no DB). All endpoints are
 * public and stateless — safe for demos and local development.
 */
@Module({
  controllers: [
    CoachController,
    WorkoutsController,
    NutritionController,
    DemoController,
  ],
  providers: [CoachService, NutritionService, WorkoutsService],
})
export class CoachModule {}
