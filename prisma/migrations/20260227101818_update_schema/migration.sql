-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';
