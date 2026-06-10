import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

const EQUIPMENT = [
  'bodyweight',
  'dumbbells',
  'barbell',
  'bench',
  'resistanceBand',
  'pullupBar',
  'treadmill',
  'cycle',
  'none',
] as const;

export class GenerateWorkoutDto {
  @IsIn(['gym', 'home', 'outdoor', 'office', 'mixed'])
  location: 'gym' | 'home' | 'outdoor' | 'office' | 'mixed';

  @IsInt()
  @IsIn([10, 20, 30, 45, 60, 15, 25])
  durationMin: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(EQUIPMENT, { each: true })
  equipment: (typeof EQUIPMENT)[number][];

  @IsIn([
    'fatLoss',
    'strength',
    'muscleBuilding',
    'mobility',
    'cardio',
    'balanced',
  ])
  focus:
    | 'fatLoss'
    | 'strength'
    | 'muscleBuilding'
    | 'mobility'
    | 'cardio'
    | 'balanced';

  @IsIn(['beginner', 'intermediate', 'advanced'])
  level: 'beginner' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsString()
  title?: string;
}
