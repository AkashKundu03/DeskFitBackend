import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** A user-or-demo profile the coach engine reasons over. */
export class CoachProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsInt()
  @Min(13)
  @Max(100)
  age: number;

  @IsIn(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm: number;

  @IsNumber()
  @Min(30)
  @Max(300)
  weightKg: number;

  @IsNumber()
  @Min(30)
  @Max(300)
  targetWeightKg: number;

  @IsIn(['sedentary', 'light', 'moderate', 'active', 'veryActive'])
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';

  @IsIn(['fatLoss', 'muscleGain', 'maintenance'])
  goal: 'fatLoss' | 'muscleGain' | 'maintenance';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(36)
  timelineMonths?: number;

  /** Optional demo narrative: which planned weekday was missed (e.g. "Fri"). */
  @IsOptional()
  @IsString()
  missedWeekday?: string;
}
