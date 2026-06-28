import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { MealTemplateService } from './meal-template.service';
import {
  CreateMealTemplateDto,
  EditPortionDto,
  MealActionDto,
  RegenerateMealDto,
} from './dto/meal-template.dto';
import { isValidISODate } from '../coach/week';

/**
 * Repeating weekly meal template (Phase 2). Distinct paths from the legacy
 * macro-target endpoints (`/nutrition/meal-plan*`) so nothing collides.
 */
@Controller('nutrition/weekly')
@UseGuards(JwtAuthGuard)
export class MealTemplateController {
  constructor(private readonly meals: MealTemplateService) {}

  /** The curated food catalog (for the "Build your thali" swap UI). */
  @Get('food-catalog')
  catalog() {
    return this.meals.getCatalog();
  }

  @Post('plan')
  @HttpCode(200)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMealTemplateDto) {
    return this.meals.createWeeklyPlan(user.userId, dto);
  }

  @Get('current')
  current(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    const localToday = date && isValidISODate(date) ? date : undefined;
    return this.meals.getCurrent(user.userId, localToday);
  }

  @Post('meal/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Body() dto: MealActionDto) {
    return this.meals.setMealStatus(user.userId, dto.mealId, 'completed');
  }

  @Post('meal/skip')
  @HttpCode(200)
  skip(@CurrentUser() user: AuthUser, @Body() dto: MealActionDto) {
    return this.meals.setMealStatus(user.userId, dto.mealId, 'skipped');
  }

  /** Regenerate one meal (subject to 5 successful swaps/week). */
  @Post('meal/regenerate')
  @HttpCode(200)
  regenerate(@CurrentUser() user: AuthUser, @Body() dto: RegenerateMealDto) {
    return this.meals.regenerateMeal(user.userId, dto.mealId, dto.date);
  }

  /** "Build your thali" — edit a portion's grams / swap its food. */
  @Post('portion')
  @HttpCode(200)
  editPortion(@CurrentUser() user: AuthUser, @Body() dto: EditPortionDto) {
    return this.meals.editPortion(user.userId, dto);
  }
}
