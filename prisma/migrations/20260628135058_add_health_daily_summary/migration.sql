-- CreateTable
CREATE TABLE "HealthDailySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "steps" INTEGER,
    "activeEnergyKcal" INTEGER,
    "exerciseMinutes" INTEGER,
    "sleepMinutes" INTEGER,
    "restingHR" INTEGER,
    "hrv" DOUBLE PRECISION,
    "workoutCount" INTEGER,
    "workoutMinutes" INTEGER,
    "sourceCoverage" JSONB,
    "sampleTimestamps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthDailySummary_userId_date_idx" ON "HealthDailySummary"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HealthDailySummary_userId_date_key" ON "HealthDailySummary"("userId", "date");

-- AddForeignKey
ALTER TABLE "HealthDailySummary" ADD CONSTRAINT "HealthDailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
