import { Module } from '@nestjs/common';
import { CoachModule } from '../coach/coach.module';
import { WorkoutPlanController } from './workout-plan.controller';
import { WorkoutPlanService } from './workout-plan.service';
import { MealPlanController } from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';
import { MealTemplateController } from './meal-template.controller';
import { MealTemplateService } from './meal-template.service';

/**
 * Authenticated persistence for the Phase 2 planner. Reuses the deterministic
 * engines exported by CoachModule (WeeklyPlannerService, MealPlannerService) and
 * stores their output via Prisma. The JWT strategy is registered app-wide by
 * AuthModule, so the JwtAuthGuard works here without re-importing it.
 */
@Module({
  imports: [CoachModule],
  controllers: [WorkoutPlanController, MealPlanController, MealTemplateController],
  providers: [WorkoutPlanService, MealPlanService, MealTemplateService],
})
export class PlansModule {}
