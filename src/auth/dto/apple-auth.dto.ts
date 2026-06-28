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

  // Authorization code — exchanged for a refresh token so the account can be
  // properly revoked at deletion. Optional (older clients omit it).
  @IsOptional()
  @IsString()
  authorizationCode?: string;
}
