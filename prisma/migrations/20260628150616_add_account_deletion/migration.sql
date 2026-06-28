-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appleRefreshToken" TEXT,
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AccountDeletionFeedback" (
    "id" TEXT NOT NULL,
    "reason" TEXT,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionFeedback_pkey" PRIMARY KEY ("id")
);
