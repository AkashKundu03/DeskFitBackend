import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
} from 'class-validator';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
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

export class CreateWeeklyPlanDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEEKDAYS, { each: true })
  selectedDays: (typeof WEEKDAYS)[number][];

  @IsIn(['gym', 'home', 'outdoor', 'office', 'mixed'])
  location: 'gym' | 'home' | 'outdoor' | 'office' | 'mixed';

  @IsInt()
  @IsIn([10, 15, 20, 25, 30, 45, 60])
  durationMin: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(EQUIPMENT, { each: true })
  equipment: (typeof EQUIPMENT)[number][];

  @IsIn(['beginner', 'intermediate', 'advanced'])
  level: 'beginner' | 'intermediate' | 'advanced';

  @IsIn(['fatLoss', 'muscleGain', 'maintenance'])
  goal: 'fatLoss' | 'muscleGain' | 'maintenance';
}
