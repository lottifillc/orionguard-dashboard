-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Device_lastHeartbeatAt_idx" ON "Device"("lastHeartbeatAt");
