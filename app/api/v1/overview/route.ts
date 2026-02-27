import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const employees = await prisma.employee.count()
  const devices = await prisma.device.count()
  const sessions = await prisma.session.findMany()

  const totalActive = sessions.reduce((acc, s) => acc + s.totalActiveSeconds, 0)
  const totalIdle = sessions.reduce((acc, s) => acc + s.totalIdleSeconds, 0)

  const productivity =
    totalActive + totalIdle === 0
      ? 0
      : Math.round((totalActive / (totalActive + totalIdle)) * 100)

  return NextResponse.json({
    employees,
    devices,
    productivity,
  })
}