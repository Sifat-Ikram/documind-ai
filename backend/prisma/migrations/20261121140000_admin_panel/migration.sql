-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('WRITER', 'ANALYSIS', 'CHAT', 'SEARCH');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('FEEDBACK', 'BUG_REPORT');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER',
  ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "blockedAt" TIMESTAMP(3),
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "lastActiveAt" TIMESTAMP(3);

-- AlterTable: existing documents were already processed when they were saved
ALTER TABLE "Document"
  ADD COLUMN "processingStatus" "DocumentStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedProcessingLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "FeedbackType" NOT NULL DEFAULT 'FEEDBACK',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");
CREATE INDEX "AiUsage_feature_createdAt_idx" ON "AiUsage"("feature", "createdAt");
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
CREATE INDEX "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");
CREATE INDEX "ApiRequestLog_status_createdAt_idx" ON "ApiRequestLog"("status", "createdAt");
CREATE INDEX "FailedProcessingLog_createdAt_idx" ON "FailedProcessingLog"("createdAt");
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FailedProcessingLog" ADD CONSTRAINT "FailedProcessingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The existing account that owns the product gets Admin access.
-- No account is created here; only this one existing row is promoted.
UPDATE "User" SET "role" = 'ADMIN' WHERE lower("email") = lower('sifatikram@gmail.com');
