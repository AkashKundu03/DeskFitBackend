import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { CoachService } from './coach.service';
import { NutritionService } from './nutrition.service';
import { CoachProfileDto } from './dto/coach-profile.dto';
import { DEMO_PROFILES, findDemoProfile } from './data/demo-profiles';
import type { CoachProfileInput } from './coach.types';

/**
 * Public, stateless coach endpoints (no auth, no DB writes). Everything is
 * deterministic — no AI/LLM. Safe for the VC demo flow and local development.
 */
@Controller('coach')
export class CoachController {
  constructor(
    private readonly coach: CoachService,
    private readonly nutrition: NutritionService,
  ) {}

  /** Nutrition + fat-loss targets for a posted profile. */
  @Post('calculate-targets')
  @HttpCode(200)
  calculateTargets(@Body() dto: CoachProfileDto) {
    return this.nutrition.calculateTargets(this.toInput(dto));
  }

  /** Full Today dashboard for a posted (real) profile. */
  @Post('today')
  @HttpCode(200)
  todayForProfile(@Body() dto: CoachProfileDto) {
    return this.coach.today(this.toInput(dto), {
      missedWeekday: dto.missedWeekday ?? null,
      isDemo: false,
    });
  }

  /** Full Today dashboard for a DEMO profile (defaults to the busy IT worker). */
  @Get('today')
  todayDemo(@Query('profile') profileId?: string) {
    const demo =
      findDemoProfile(profileId ?? 'busy-it-worker') ?? DEMO_PROFILES[0];
    return this.coach.today(demo.profile, {
      missedWeekday: demo.missedWeekday,
      isDemo: true,
    });
  }

  private toInput(dto: CoachProfileDto): CoachProfileInput {
    return {
      name: dto.name,
      age: dto.age,
      gender: dto.gender,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      targetWeightKg: dto.targetWeightKg,
      activityLevel: dto.activityLevel,
      goal: dto.goal,
      timelineMonths: dto.timelineMonths,
    };
  }
}
