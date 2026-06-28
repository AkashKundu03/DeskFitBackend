import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { HealthService } from './health.service';
import { HealthDailyBatchDto, HealthDailyDto } from './dto/health-daily.dto';
import { HealthCheckInDto } from './dto/health-checkin.dto';
import { isValidISODate } from '../coach/week';

/**
 * Opt-in daily health aggregates (Phase 3). Raw HealthKit samples never leave
 * the device — only these summaries, and only if the user enables sync.
 */
@Controller('me/health')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Put('daily')
  upsertDaily(@CurrentUser() user: AuthUser, @Body() dto: HealthDailyDto) {
    return this.health.upsertDaily(user.userId, dto);
  }

  @Post('daily/batch')
  @HttpCode(200)
  upsertBatch(@CurrentUser() user: AuthUser, @Body() dto: HealthDailyBatchDto) {
    return this.health.upsertMany(user.userId, dto.days);
  }

  @Get('daily')
  range(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.health.getRange(user.userId, from, to);
  }

  /** Subjective daily check-in (energy / soreness / mood / stress). */
  @Put('checkin')
  upsertCheckIn(@CurrentUser() user: AuthUser, @Body() dto: HealthCheckInDto) {
    return this.health.upsertCheckIn(user.userId, dto);
  }

  /** Deterministic recovery-signal insight from the user's own baseline. */
  @Get('insight')
  insight(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    const today = date && isValidISODate(date) ? date : new Date().toISOString().slice(0, 10);
    return this.health.getInsight(user.userId, today);
  }
}

