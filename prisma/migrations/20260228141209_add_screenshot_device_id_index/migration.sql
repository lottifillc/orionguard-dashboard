-- AlterTable
ALTER TABLE "Screenshot" ADD COLUMN     "deviceId" TEXT;

-- Backfill deviceId from Session
UPDATE "Screenshot" s
SET "deviceId" = sess."deviceId"
FROM "Session" sess
WHERE s."sessionId" = sess.id AND s."deviceId" IS NULL;

-- CreateIndex
CREATE INDEX "Screenshot_deviceId_capturedAt_idx" ON "Screenshot"("deviceId", "capturedAt");
