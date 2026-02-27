/*
  Warnings:

  - You are about to drop the column `sessionId` on the `DeviceLoginEvent` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `EmployeeDailyStats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'SUPERVISOR', 'ADMIN');

-- DropForeignKey
ALTER TABLE "DeviceLoginEvent" DROP CONSTRAINT "DeviceLoginEvent_sessionId_fkey";

-- DropIndex
DROP INDEX "DeviceLoginEvent_sessionId_idx";

-- DropIndex
DROP INDEX "EmployeeDailyStats_employeeId_date_idx";

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "DeviceLoginEvent" DROP COLUMN "sessionId";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'EMPLOYEE';

-- AlterTable
ALTER TABLE "EmployeeDailyStats" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "companyId" TEXT;

UPDATE "Session" SET "companyId" = "Device"."companyId" FROM "Device" WHERE "Session"."deviceId" = "Device"."id";

ALTER TABLE "Session" ALTER COLUMN     "companyId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralFingerprint" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "avgSessionLength" DOUBLE PRECISION NOT NULL,
    "avgIdleRatio" DOUBLE PRECISION NOT NULL,
    "avgProductiveRatio" DOUBLE PRECISION NOT NULL,
    "distractionRatio" DOUBLE PRECISION NOT NULL,
    "consistencyScore" DOUBLE PRECISION NOT NULL,
    "supervisorInterventionCount" INTEGER NOT NULL DEFAULT 0,
    "fingerprintScore" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehavioralFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorEmployeeId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_companyId_idx" ON "Branch"("companyId");

-- CreateIndex
CREATE INDEX "Branch_companyId_name_idx" ON "Branch"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BehavioralFingerprint_employeeId_key" ON "BehavioralFingerprint"("employeeId");

-- CreateIndex
CREATE INDEX "BehavioralFingerprint_employeeId_idx" ON "BehavioralFingerprint"("employeeId");

-- CreateIndex
CREATE INDEX "BehavioralFingerprint_fingerprintScore_idx" ON "BehavioralFingerprint"("fingerprintScore");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_sessionId_idx" ON "Activity"("sessionId");

-- CreateIndex
CREATE INDEX "Activity_startTime_idx" ON "Activity"("startTime");

-- CreateIndex
CREATE INDEX "Device_branchId_idx" ON "Device"("branchId");

-- CreateIndex
CREATE INDEX "DeviceLoginEvent_loginAt_idx" ON "DeviceLoginEvent"("loginAt");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_companyId_role_idx" ON "Employee"("companyId", "role");

-- CreateIndex
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");

-- CreateIndex
CREATE INDEX "EmployeeDailyStats_riskScore_idx" ON "EmployeeDailyStats"("riskScore");

-- CreateIndex
CREATE INDEX "IdleLog_sessionId_idx" ON "IdleLog"("sessionId");

-- CreateIndex
CREATE INDEX "IdleLog_startTime_idx" ON "IdleLog"("startTime");

-- CreateIndex
CREATE INDEX "Screenshot_sessionId_idx" ON "Screenshot"("sessionId");

-- CreateIndex
CREATE INDEX "Screenshot_capturedAt_idx" ON "Screenshot"("capturedAt");

-- CreateIndex
CREATE INDEX "Session_companyId_idx" ON "Session"("companyId");

-- CreateIndex
CREATE INDEX "Session_loginTime_idx" ON "Session"("loginTime");

-- CreateIndex
CREATE INDEX "WorkShift_companyId_name_idx" ON "WorkShift"("companyId", "name");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralFingerprint" ADD CONSTRAINT "BehavioralFingerprint_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
