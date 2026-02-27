/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `IdleLog` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `IdleLog` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Screenshot` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `Screenshot` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Session` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,employeeCode]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `durationSeconds` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `windowTitle` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employeeCode` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationSeconds` to the `IdleLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `IdleLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `IdleLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `Screenshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "createdAt",
DROP COLUMN "duration",
DROP COLUMN "title",
ADD COLUMN     "durationSeconds" INTEGER NOT NULL,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "url" TEXT,
ADD COLUMN     "windowTitle" TEXT NOT NULL,
ALTER COLUMN "category" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "email",
DROP COLUMN "name",
ADD COLUMN     "employeeCode" TEXT NOT NULL,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "IdleLog" DROP COLUMN "createdAt",
DROP COLUMN "duration",
ADD COLUMN     "durationSeconds" INTEGER NOT NULL,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Screenshot" DROP COLUMN "createdAt",
DROP COLUMN "path",
ADD COLUMN     "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "filePath" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "createdAt",
DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "logoutTime" TIMESTAMP(3),
ADD COLUMN     "totalActiveSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalIdleSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceIdentifier_key" ON "Device"("deviceIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_employeeCode_key" ON "Employee"("companyId", "employeeCode");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
