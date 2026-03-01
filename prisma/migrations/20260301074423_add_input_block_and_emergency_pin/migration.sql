-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "inputBlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EmergencyPinConfig" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configuredBy" TEXT,

    CONSTRAINT "EmergencyPinConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyPinConfig_deviceId_key" ON "EmergencyPinConfig"("deviceId");

-- CreateIndex
CREATE INDEX "EmergencyPinConfig_deviceId_idx" ON "EmergencyPinConfig"("deviceId");

-- AddForeignKey
ALTER TABLE "EmergencyPinConfig" ADD CONSTRAINT "EmergencyPinConfig_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
