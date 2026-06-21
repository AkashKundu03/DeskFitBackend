import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { MeService } from './me.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateGutAnswersDto } from './dto/update-gut-answers.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getMe(@CurrentUser() user: AuthUser) {
    return this.meService.getMe(user.userId);
  }

  @Get('assessment')
  getAssessment(@CurrentUser() user: AuthUser) {
    return this.meService.getAssessment(user.userId);
  }

  @Put('assessment')
  updateAssessment(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.meService.upsertAssessment(user.userId, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.meService.getProfile(user.userId);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.meService.upsertProfile(user.userId, dto);
  }

  @Get('gut-answers')
  getGutAnswers(@CurrentUser() user: AuthUser) {
    return this.meService.getGutAnswers(user.userId);
  }

  @Put('gut-answers')
  updateGutAnswers(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateGutAnswersDto,
  ) {
    return this.meService.upsertGutAnswers(user.userId, dto);
  }

  @Get('report')
  getReport(@CurrentUser() user: AuthUser) {
    return this.meService.getReport(user.userId);
  }

  @Put('report')
  updateReport(@CurrentUser() user: AuthUser, @Body() dto: UpdateReportDto) {
    return this.meService.upsertReport(user.userId, dto);
  }

  @Post('events')
  createEvent(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.meService.createEvent(user.userId, dto);
  }
}
