import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';
import { UpdateGutAnswersDto } from './update-gut-answers.dto';
import { UpdateReportDto } from './update-report.dto';

/**
 * Combined assessment payload so an authenticated user can persist their full
 * questionnaire result in a single call. Each section is optional and validated
 * with the same rules as the granular /me/profile, /me/gut-answers, /me/report
 * endpoints. Persisted transactionally by MeService.upsertAssessment.
 */
export class UpdateAssessmentDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  profile?: UpdateProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateGutAnswersDto)
  gutAnswers?: UpdateGutAnswersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateReportDto)
  report?: UpdateReportDto;
}
