import { IsArray, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateReportDto {
  @IsOptional()
  @IsNumber()
  bmi?: number;

  @IsOptional()
  @IsString()
  bmiCategory?: string;

  @IsOptional()
  @IsNumber()
  bmr?: number;

  @IsOptional()
  @IsNumber()
  tdee?: number;

  @IsOptional()
  @IsNumber()
  healthyWeightMin?: number;

  @IsOptional()
  @IsNumber()
  healthyWeightMax?: number;

  @IsOptional()
  @IsNumber()
  targetCaloriesMin?: number;

  @IsOptional()
  @IsNumber()
  targetCaloriesMax?: number;

  @IsOptional()
  @IsNumber()
  gutHealthScore?: number;

  @IsOptional()
  @IsInt()
  educationalGutAge?: number;

  @IsOptional()
  @IsArray()
  priorityActions?: unknown[];

  @IsOptional()
  @IsArray()
  riskSignals?: unknown[];
}
