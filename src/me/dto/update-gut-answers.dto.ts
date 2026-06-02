import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateGutAnswersDto {
  @IsOptional()
  @IsString()
  bowelFrequency?: string;

  @IsOptional()
  @IsString()
  stoolConsistency?: string;

  @IsOptional()
  @IsString()
  bloatingFrequency?: string;

  @IsOptional()
  @IsNumber()
  waterIntake?: number;

  @IsOptional()
  @IsNumber()
  sleepHours?: number;
}
