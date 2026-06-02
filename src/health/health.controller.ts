import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      app: 'DeskFit',
      timestamp: new Date().toISOString(),
    };
  }
}
