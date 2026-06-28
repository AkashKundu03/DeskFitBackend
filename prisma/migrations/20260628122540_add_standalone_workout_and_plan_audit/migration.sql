-- CreateTable
CREATE TABLE "StandaloneWorkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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

    CONSTRAINT "StandaloneWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "kind" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StandaloneWorkout_userId_date_idx" ON "StandaloneWorkout"("userId", "date");

-- CreateIndex
CREATE INDEX "PlanAuditEvent_userId_createdAt_idx" ON "PlanAuditEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "StandaloneWorkout" ADD CONSTRAINT "StandaloneWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAuditEvent" ADD CONSTRAINT "PlanAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
