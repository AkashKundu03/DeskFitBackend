import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Optional exit reason — NEVER blocks deletion; stored anonymously. */
export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
