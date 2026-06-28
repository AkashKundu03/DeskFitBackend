import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  controllers: [MeController, HealthController, AccountController],
  providers: [MeService, HealthService, AccountService],
})
export class MeModule {}
