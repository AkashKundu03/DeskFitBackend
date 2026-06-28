-- CreateTable
CREATE TABLE "HealthCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "energy" INTEGER,
    "soreness" INTEGER,
    "mood" INTEGER,
    "stress" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthCheckIn_userId_date_idx" ON "HealthCheckIn"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HealthCheckIn_userId_date_key" ON "HealthCheckIn"("userId", "date");

-- AddForeignKey
ALTER TABLE "HealthCheckIn" ADD CONSTRAINT "HealthCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
