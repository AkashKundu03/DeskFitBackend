import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  Matches,
} from 'class-validator';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * "Fix my remaining week" — optional client LOCAL date (so week boundaries match
 * the user's timezone) and optional unavailable days to route around.
 */
export class FixWeekDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be yyyy-mm-dd' })
  date?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(WEEKDAYS, { each: true })
  unavailableDays?: (typeof WEEKDAYS)[number][];
}
