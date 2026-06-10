import { Controller, Get, Query } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import { DEMO_PROFILES, findDemoProfile } from './data/demo-profiles';

/**
 * Public nutrition endpoint. GET returns targets for a DEMO profile (defaults to
 * the busy IT worker) — handy for quickly populating the nutrition card in a
 * demo. Real per-user targets come from POST /coach/calculate-targets.
 */
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutrition: NutritionService) {}

  @Get('targets')
  targets(@Query('profile') profileId?: string) {
    const demo =
      findDemoProfile(profileId ?? 'busy-it-worker') ?? DEMO_PROFILES[0];
    return this.nutrition.calculateTargets(demo.profile);
  }
}
