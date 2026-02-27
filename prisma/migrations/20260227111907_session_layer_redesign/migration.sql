-- CreateEnum
CREATE TYPE "LoginReason" AS ENUM ('NORMAL', 'SUPERVISOR', 'ADMIN_OVERRIDE');

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_employeeId_fkey";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "deviceBootAt" TIMESTAMP(3),
ADD COLUMN     "deviceShutdownAt" TIMESTAMP(3),
ADD COLUMN     "isSystemSession" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "employeeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WorkShift" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeShiftAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "assignedFrom" TIMESTAMP(3) NOT NULL,
    "assignedTo" TIMESTAMP(3),

    CONSTRAINT "EmployeeShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceLoginEvent" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL,
    "logoutAt" TIMESTAMP(3),
    "reason" "LoginReason" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceLoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDailyStats" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalWorkSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalActiveSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalIdleSeconds" INTEGER NOT NULL DEFAULT 0,
    "shiftSeconds" INTEGER NOT NULL DEFAULT 0,
    "outsideShiftSeconds" INTEGER NOT NULL DEFAULT 0,
    "riskScore" DOUBLE PRECISION,
    "productivityScore" DOUBLE PRECISION,

    CONSTRAINT "EmployeeDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkShift_companyId_idx" ON "WorkShift"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeShiftAssignment_employeeId_idx" ON "EmployeeShiftAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeShiftAssignment_shiftId_idx" ON "EmployeeShiftAssignment"("shiftId");

-- CreateIndex
CREATE INDEX "EmployeeShiftAssignment_employeeId_assignedFrom_idx" ON "EmployeeShiftAssignment"("employeeId", "assignedFrom");

-- CreateIndex
CREATE INDEX "DeviceLoginEvent_deviceId_loginAt_idx" ON "DeviceLoginEvent"("deviceId", "loginAt");

-- CreateIndex
CREATE INDEX "DeviceLoginEvent_employeeId_loginAt_idx" ON "DeviceLoginEvent"("employeeId", "loginAt");

-- CreateIndex
CREATE INDEX "DeviceLoginEvent_sessionId_idx" ON "DeviceLoginEvent"("sessionId");

-- CreateIndex
CREATE INDEX "EmployeeDailyStats_employeeId_idx" ON "EmployeeDailyStats"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDailyStats_date_idx" ON "EmployeeDailyStats"("date");

-- CreateIndex
CREATE INDEX "EmployeeDailyStats_employeeId_date_idx" ON "EmployeeDailyStats"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDailyStats_employeeId_date_key" ON "EmployeeDailyStats"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Device_companyId_idx" ON "Device"("companyId");

-- CreateIndex
CREATE INDEX "Session_deviceId_idx" ON "Session"("deviceId");

-- CreateIndex
CREATE INDEX "Session_deviceId_loginTime_idx" ON "Session"("deviceId", "loginTime");

-- AddForeignKey
ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShiftAssignment" ADD CONSTRAINT "EmployeeShiftAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShiftAssignment" ADD CONSTRAINT "EmployeeShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "WorkShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceLoginEvent" ADD CONSTRAINT "DeviceLoginEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceLoginEvent" ADD CONSTRAINT "DeviceLoginEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceLoginEvent" ADD CONSTRAINT "DeviceLoginEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDailyStats" ADD CONSTRAINT "EmployeeDailyStats_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
