import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { MealPlanService } from './meal-plan.service';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { AdjustMealPlanDto, MealActionDto } from './dto/meal-action.dto';

/**
 * Authenticated, DB-backed meal-target planner. Phase 2 persists a meal-wise
 * macro distribution (targets, not recipes) and a simple per-meal lifecycle.
 */
@Controller('nutrition')
@UseGuards(JwtAuthGuard)
export class MealPlanController {
  constructor(private readonly meals: MealPlanService) {}

  @Post('meal-plan')
  @HttpCode(200)
  createMealPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMealPlanDto,
  ) {
    return this.meals.createMealPlan(user.userId, dto);
  }

  @Get('meal-plan/today')
  getToday(@CurrentUser() user: AuthUser) {
    return this.meals.getToday(user.userId);
  }

  @Post('meal/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Body() dto: MealActionDto) {
    return this.meals.completeMeal(user.userId, dto.mealId);
  }

  @Post('meal/skip')
  @HttpCode(200)
  skip(@CurrentUser() user: AuthUser, @Body() dto: MealActionDto) {
    return this.meals.skipMeal(user.userId, dto.mealId);
  }

  @Post('meal/adjust')
  @HttpCode(200)
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustMealPlanDto) {
    return this.meals.adjust(user.userId, dto);
  }
}
