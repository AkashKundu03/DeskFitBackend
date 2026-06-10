import { Controller, Get } from '@nestjs/common';
import { DEMO_PROFILES } from './data/demo-profiles';

/** Exposes the clearly-marked demo/sample profiles for the VC demo flow. */
@Controller('demo')
export class DemoController {
  @Get('sample-profiles')
  sampleProfiles() {
    return {
      isDemo: true,
      note: 'Sample data for demos only — not real users.',
      profiles: DEMO_PROFILES,
    };
  }
}
