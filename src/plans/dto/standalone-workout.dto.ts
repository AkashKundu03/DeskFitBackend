import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
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
  'kettlebell',
  'cable',
  'machine',
  'smithMachine',
  'rowingMachine',
  'jumpRope',
  'medicineBall',
  'trx',
  'none',
] as const;

/** Generate + persist a one-off "today only" workout. */
export class CreateStandaloneWorkoutDto {
  @IsIn(['gym', 'home', 'outdoor', 'office', 'mixed'])
  location: 'gym' | 'home' | 'outdoor' | 'office' | 'mixed';

  @IsInt()
  @IsIn([10, 15, 20, 25, 30, 45, 60])
  durationMin: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(EQUIPMENT, { each: true })
  equipment: (typeof EQUIPMENT)[number][];

  @IsIn(['fatLoss', 'strength', 'muscleBuilding', 'mobility', 'cardio', 'balanced'])
  focus: 'fatLoss' | 'strength' | 'muscleBuilding' | 'mobility' | 'cardio' | 'balanced';

  @IsIn(['beginner', 'intermediate', 'advanced'])
  level: 'beginner' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be yyyy-mm-dd' })
  date?: string;
}

/** Acts on a single standalone workout by id. */
export class StandaloneActionDto {
  @IsString()
  id: string;
}
