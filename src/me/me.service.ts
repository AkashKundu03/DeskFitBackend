import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateGutAnswersDto } from './dto/update-gut-answers.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  upsertProfile(userId: string, dto: UpdateProfileDto) {
    const data = {
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
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  getGutAnswers(userId: string) {
    return this.prisma.gutAnswers.findUnique({ where: { userId } });
  }

  upsertGutAnswers(userId: string, dto: UpdateGutAnswersDto) {
    const data = {
      bowelFrequency: dto.bowelFrequency,
      stoolConsistency: dto.stoolConsistency,
      bloatingFrequency: dto.bloatingFrequency,
      waterIntake: dto.waterIntake,
      sleepHours: dto.sleepHours,
    };
    return this.prisma.gutAnswers.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  getReport(userId: string) {
    return this.prisma.healthReport.findUnique({ where: { userId } });
  }

  upsertReport(userId: string, dto: UpdateReportDto) {
    const data = {
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
    return this.prisma.healthReport.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
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
