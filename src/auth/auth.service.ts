import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SocialTokenVerifier } from './social-token-verifier';
import { AppleAccountService } from './apple-account.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly socialVerifier: SocialTokenVerifier,
    private readonly apple: AppleAccountService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        authProvider: 'EMAIL',
      },
    });

    return this.buildToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildToken(user.id, user.email);
  }

  async appleSignIn(dto: AppleAuthDto) {
    const identity = await this.socialVerifier.verifyApple(dto.identityToken);
    const user = await this.resolveSocialUser(
      'APPLE',
      identity.sub,
      identity.email ?? dto.email,
    );
    // Best-effort: capture a refresh token so the account can be properly revoked
    // at deletion. Never blocks sign-in.
    if (dto.authorizationCode && this.apple.isConfigured()) {
      const refresh = await this.apple.exchangeAuthorizationCode(dto.authorizationCode);
      if (refresh) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { appleRefreshToken: refresh },
        });
      }
    }
    return this.buildToken(user.id, user.email);
  }

  async googleSignIn(dto: GoogleAuthDto) {
    const identity = await this.socialVerifier.verifyGoogle(dto.idToken);
    const user = await this.resolveSocialUser('GOOGLE', identity.sub, identity.email);
    return this.buildToken(user.id, user.email);
  }

  /** Finds an existing social user, links by email, or creates a new one. */
  private async resolveSocialUser(
    provider: 'APPLE' | 'GOOGLE',
    providerUserId: string,
    email?: string,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { authProvider: provider, providerUserId },
    });
    if (existing) return existing;

    if (email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        return this.prisma.user.update({
          where: { id: byEmail.id },
          data: { authProvider: provider, providerUserId },
        });
      }
    }

    // Apple may omit email after the first authorization; synthesize a stable placeholder.
    const safeEmail =
      email ?? `${provider.toLowerCase()}_${providerUserId}@users.deskfit.local`;
    return this.prisma.user.create({
      data: { email: safeEmail, authProvider: provider, providerUserId },
    });
  }

  private buildToken(userId: string, email: string) {
    const accessToken = this.jwt.sign({ sub: userId, email });
    return { accessToken };
  }
}
