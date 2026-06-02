import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  eventName: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
