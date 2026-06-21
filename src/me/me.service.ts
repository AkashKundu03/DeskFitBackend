import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateGutAnswersDto } from './dto/update-gut-answers.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate account snapshot used by the iOS app on launch / after Apple
   * sign-in to decide whether to skip the questionnaire and route straight to
   * Today. `hasAssessment` is true once the core questionnaire fields exist.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, gutAnswers: true, healthReport: true },
    });
    if (!user) {
      return null;
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return {
      id: safeUser.id,
      email: safeUser.email,
      authProvider: safeUser.authProvider,
      createdAt: safeUser.createdAt,
      profile: safeUser.profile,
      gutAnswers: safeUser.gutAnswers,
      report: safeUser.healthReport,
      hasAssessment: this.hasCompletedAssessment(safeUser.profile),
    };
  }

  /** Combined assessment payload (profile + gut answers + report). */
  async getAssessment(userId: string) {
    const [profile, gutAnswers, report] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.gutAnswers.findUnique({ where: { userId } }),
      this.prisma.healthReport.findUnique({ where: { userId } }),
    ]);
    return {
      profile,
      gutAnswers,
      report,
      hasAssessment: this.hasCompletedAssessment(profile),
    };
  }

  /**
   * Upsert the whole assessment in one transaction. Only sections present in the
   * payload are written, so the iOS sync flow can push profile + gut answers
   * together without clobbering an existing report. Additive — never deletes.
   */
  async upsertAssessment(userId: string, dto: UpdateAssessmentDto) {
    await this.prisma.$transaction(async (tx) => {
      if (dto.profile) {
        const data = this.profileData(dto.profile);
        await tx.userProfile.upsert({
          where: { userId },
          create: { userId, ...data },
          update: data,
        });
      }
      if (dto.gutAnswers) {
        const data = this.gutAnswersData(dto.gutAnswers);
        await tx.gutAnswers.upsert({
          where: { userId },
          create: { userId, ...data },
          update: data,
        });
      }
      if (dto.report) {
        const data = this.reportData(dto.report);
        await tx.healthReport.upsert({
          where: { userId },
          create: { userId, ...data },
          update: data,
        });
      }
    });
    return this.getAssessment(userId);
  }

  private hasCompletedAssessment(
    profile: { age?: number | null; weightKg?: number | null } | null,
  ): boolean {
    return !!profile && profile.age != null && profile.weightKg != null;
  }

  getProfile(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  upsertProfile(userId: string, dto: UpdateProfileDto) {
    const data = this.profileData(dto);
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  private profileData(dto: UpdateProfileDto) {
    return {
      name: dto.name,
      age: dto.age,
      gender: dto.gender,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      targetWeightKg: dto.targetWeightKg,
      activityLevel: dto.activityLevel,
      goal: dto.goal,
      medicalFlags: dto.medicalFlags as Prisma.InputJsonValue | undefined,
    };
  }

  getGutAnswers(userId: string) {
    return this.prisma.gutAnswers.findUnique({ where: { userId } });
  }

  upsertGutAnswers(userId: string, dto: UpdateGutAnswersDto) {
    const data = this.gutAnswersData(dto);
    return this.prisma.gutAnswers.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  private gutAnswersData(dto: UpdateGutAnswersDto) {
    return {
      bowelFrequency: dto.bowelFrequency,
      stoolConsistency: dto.stoolConsistency,
      bloatingFrequency: dto.bloatingFrequency,
      waterIntake: dto.waterIntake,
      sleepHours: dto.sleepHours,
    };
  }

  getReport(userId: string) {
    return this.prisma.healthReport.findUnique({ where: { userId } });
  }

  upsertReport(userId: string, dto: UpdateReportDto) {
    const data = this.reportData(dto);
    return this.prisma.healthReport.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  private reportData(dto: UpdateReportDto) {
    return {
      bmi: dto.bmi,
      bmiCategory: dto.bmiCategory,
      bmr: dto.bmr,
      tdee: dto.tdee,
      healthyWeightMin: dto.healthyWeightMin,
      healthyWeightMax: dto.healthyWeightMax,
      targetCaloriesMin: dto.targetCaloriesMin,
      targetCaloriesMax: dto.targetCaloriesMax,
      gutHealthScore: dto.gutHealthScore,
      educationalGutAge: dto.educationalGutAge,
      priorityActions: dto.priorityActions as Prisma.InputJsonValue | undefined,
      riskSignals: dto.riskSignals as Prisma.InputJsonValue | undefined,
      generatedAt: new Date(),
    };
  }

  createEvent(userId: string, dto: CreateEventDto) {
    return this.prisma.appEvent.create({
      data: {
        userId,
        eventName: dto.eventName,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
