import { IsIn, IsOptional, IsString } from 'class-validator';

export class AdjustWeekDto {
  @IsIn(['move_today', 'shorter', 'rebalance', 'skip'])
  strategy: 'move_today' | 'shorter' | 'rebalance' | 'skip';

  /** Which planned weekday was missed (defaults to a demo value if omitted). */
  @IsOptional()
  @IsString()
  missedWeekday?: string;
}
