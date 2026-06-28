import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

/** Subjective daily check-in (1..5 scales). All optional. */
export class HealthCheckInDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be yyyy-mm-dd' })
  date: string;

  @IsOptional() @IsInt() @Min(1) @Max(5) energy?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) soreness?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) mood?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) stress?: number;
}
