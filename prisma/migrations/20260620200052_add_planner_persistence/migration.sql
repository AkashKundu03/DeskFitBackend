-- CreateTable
CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "selectedDays" JSONB NOT NULL,
    "goal" TEXT,
    "level" TEXT,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "focusLabel" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "equipment" JSONB NOT NULL,
    "estimatedCalories" INTEGER NOT NULL,
    "warmup" JSONB NOT NULL,
    "exercises" JSONB NOT NULL,
    "coachNote" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealCount" INTEGER NOT NULL,
    "dietaryPref" TEXT NOT NULL,
    "proteinPrefs" JSONB NOT NULL,
    "carbPrefs" JSONB NOT NULL,
    "fiberPrefs" JSONB NOT NULL,
    "allergens" JSONB NOT NULL,
    "dailyKcal" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "fiberG" INTEGER NOT NULL,
    "meals" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutPlan_userId_weekStartDate_idx" ON "WorkoutPlan"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX "WorkoutPlan_userId_active_idx" ON "WorkoutPlan"("userId", "active");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_idx" ON "WorkoutSession"("userId");

-- CreateIndex
CREATE INDEX "WorkoutSession_planId_idx" ON "WorkoutSession"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_key" ON "MealPlan"("userId");

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
