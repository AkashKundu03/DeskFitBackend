import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CoachService } from './coach.service';
import { GenerateWorkoutDto } from './dto/generate-workout.dto';
import { AdjustWeekDto } from './dto/adjust-week.dto';

/**
 * Public, stateless workout endpoints. complete/skip are deterministic and do
 * not persist — they return the updated workout/plan and supportive coach copy,
 * which is all the demo + local UI need.
 */
@Controller('workouts')
export class WorkoutsController {
  constructor(
    private readonly workouts: WorkoutsService,
    private readonly coach: CoachService,
  ) {}

  @Post('generate')
  @HttpCode(200)
  generate(@Body() dto: GenerateWorkoutDto) {
    return this.workouts.generate(dto);
  }

  @Post('complete')
  @HttpCode(200)
  complete(@Body() dto: GenerateWorkoutDto) {
    return this.workouts.markCompleted(this.workouts.generate(dto));
  }

  @Post('skip')
  @HttpCode(200)
  skip(@Body() dto: GenerateWorkoutDto) {
    return this.workouts.markSkipped(this.workouts.generate(dto));
  }

  @Post('adjust-week')
  @HttpCode(200)
  adjustWeek(@Body() dto: AdjustWeekDto) {
    // Rebuild the week deterministically from the missed weekday, then adapt.
    const todayName = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
    });
    const weekly = this.coach.buildWeekly(
      todayName,
      dto.missedWeekday ?? 'Fri',
    );
    return this.coach.adjustWeek(weekly, dto.strategy);
  }
}
