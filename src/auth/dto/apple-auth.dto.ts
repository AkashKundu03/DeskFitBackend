import { IsOptional, IsString } from 'class-validator';

export class AppleAuthDto {
  @IsString()
  identityToken: string;

  // Apple only returns email/name on the first authorization; both optional.
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
