import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

/**
 * Opt-in DAILY HEALTH AGGREGATE (never raw samples). Each field is optional so
 * partial coverage (e.g. no HRV on a given day) is fine.
 */
export class HealthDailyDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be yyyy-mm-dd' })
  date: string;

  @IsString()
  timezone: string;

  @IsOptional() @IsInt() steps?: number;
  @IsOptional() @IsInt() activeEnergyKcal?: number;
  @IsOptional() @IsInt() exerciseMinutes?: number;
  @IsOptional() @IsInt() sleepMinutes?: number;
  @IsOptional() @IsInt() restingHR?: number;
  @IsOptional() @IsNumber() hrv?: number;
  @IsOptional() @IsInt() workoutCount?: number;
  @IsOptional() @IsInt() workoutMinutes?: number;

  @IsOptional() @IsObject() sourceCoverage?: Record<string, unknown>;
  @IsOptional() @IsObject() sampleTimestamps?: Record<string, unknown>;
}

/** Upload several days at once (e.g. a 14-day backfill). */
export class HealthDailyBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => HealthDailyDto)
  days: HealthDailyDto[];
}
