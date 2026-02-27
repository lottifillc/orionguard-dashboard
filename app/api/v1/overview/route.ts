import { prisma } from '@/lib/prisma'

export async function GET() {
  const employees = await prisma.employee.count()
  const devices = await prisma.device.count()

  const sessions = await prisma.session.findMany({
    select: {
      totalActiveSeconds: true,
      totalIdleSeconds: true,
    },
  })

  const totalActive = sessions.reduce(
    (acc, s) => acc + s.totalActiveSeconds,
    0
  )

  const totalIdle = sessions.reduce(
    (acc, s) => acc + s.totalIdleSeconds,
    0
  )

  const productivity =
    totalActive + totalIdle === 0
      ? 0
      : Math.round((totalActive / (totalActive + totalIdle)) * 100)

  return Response.json({
    employees,
    devices,
    productivity,
  })
}