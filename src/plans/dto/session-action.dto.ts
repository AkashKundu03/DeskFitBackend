import { IsIn, IsOptional, IsString } from 'class-validator';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Complete / skip / shorter all act on a single session by id. */
export class SessionActionDto {
  @IsString()
  sessionId: string;
}

/** Reschedule moves a session to another weekday in the same week. */
export class RescheduleSessionDto {
  @IsString()
  sessionId: string;

  @IsIn(WEEKDAYS)
  toWeekday: (typeof WEEKDAYS)[number];

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  level?: 'beginner' | 'intermediate' | 'advanced';
}
