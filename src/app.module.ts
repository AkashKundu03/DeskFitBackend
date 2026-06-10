import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './me/me.module';
import { CoachModule } from './coach/coach.module';

@Module({
  imports: [
    // Env precedence: `.env.local` (local dev, git-ignored) overrides `.env`.
    // In production neither file exists in the container — docker injects the
    // env vars directly — so this is a no-op there and does not affect prod.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    PrismaModule,
    AuthModule,
    MeModule,
    CoachModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
