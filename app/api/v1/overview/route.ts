import { prisma } from '@/lib/prisma'

function getTodayRange(): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0)
  return { start, end }
}

export async function GET() {
  const { start: startOfToday, end: endOfToday } = getTodayRange()

  const [
    employees,
    devices,
    activeSessions,
    todaySessions,
    screenshotsToday,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.device.count(),
    prisma.session.count({ where: { logoutTime: null } }),
    prisma.session.findMany({
      where: {
        loginTime: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      select: {
        totalActiveSeconds: true,
        totalIdleSeconds: true,
      },
    }),
    prisma.screenshot.count({
      where: {
        capturedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
  ])

  const totalActiveSecondsToday = todaySessions.reduce(
    (acc, s) => acc + s.totalActiveSeconds,
    0
  )

  const totalIdleSecondsToday = todaySessions.reduce(
    (acc, s) => acc + s.totalIdleSeconds,
    0
  )

  const totalSeconds = totalActiveSecondsToday + totalIdleSecondsToday
  const productivity =
    totalSeconds === 0
      ? 0
      : Math.round((totalActiveSecondsToday / totalSeconds) * 100)

  return Response.json({
    employees,
    devices,
    activeSessions,
    totalActiveSecondsToday,
    totalIdleSecondsToday,
    productivity,
    screenshotsToday,
  })
}
