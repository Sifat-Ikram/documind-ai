-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "versionCreatedAt" TIMESTAMP(3),
ADD COLUMN     "versionCreatedById" TEXT,
ADD COLUMN     "versionNote" TEXT;
