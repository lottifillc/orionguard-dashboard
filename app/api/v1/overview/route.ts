import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getOverviewMetrics,
  getEmployeeProductivity,
  getWeeklyProductivityTrend,
  getDeviceStatus,
} from '@/src/lib/analytics/overview.service'

function getDateRangeFromQuery(
  startStr?: string | null,
  endStr?: string | null
): { start: Date; end: Date } {
  const end = endStr ? new Date(endStr) : new Date()
  const start = startStr ? new Date(startStr) : new Date(end)
  if (!startStr) {
    start.setDate(start.getDate() - 6)
  }
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffMins < 1) return 'الآن'
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  return `منذ ${Math.floor(diffHours / 24)} يوم`
}

export async function GET(request: Request) {
  const sessionsCount = await prisma.session.count()
  const activitiesCount = await prisma.activity.count()
  console.log("Total Sessions:", sessionsCount)
  console.log("Total Activities:", activitiesCount)

  const { searchParams } = new URL(request.url)
  let companyId = searchParams.get('companyId')
  const startStr = searchParams.get('start')
  const endStr = searchParams.get('end')

  if (!companyId) {
    const first = await prisma.company.findFirst({ select: { id: true } })
    companyId = first?.id ?? ''
  }

  if (!companyId) {
    return NextResponse.json({
      metrics: {
        totalEmployees: 0,
        totalDevices: 0,
        onlineDevices: 0,
        totalSessions: 0,
        activeMinutes: 0,
        idleMinutes: 0,
        productivityPercentage: 0,
      },
      employees: [],
      weeklyTrend: [],
      devices: [],
      activities: [],
      companies: [],
    })
  }

  const dateRange = getDateRangeFromQuery(startStr, endStr)

  const [company, companies, metrics, employees, weeklyTrend, devices, activitiesRaw] =
    await Promise.all([
      prisma.company.findFirst({
        where: { id: companyId },
        select: { id: true, name: true },
      }),
      prisma.company.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      getOverviewMetrics(companyId, dateRange),
      getEmployeeProductivity(companyId, dateRange),
      getWeeklyProductivityTrend(companyId),
      getDeviceStatus(companyId),
      prisma.activity.findMany({
        where: { session: { companyId } },
        take: 50,
        orderBy: { startTime: 'desc' },
        include: {
          session: {
            include: {
              employee: { select: { fullName: true } },
              device: { select: { deviceName: true } },
            },
          },
        },
      }),
    ])

  const activities = activitiesRaw.map((a) => ({
    id: a.id,
    user: a.session?.employee?.fullName ?? a.session?.device?.deviceName ?? 'نظام',
    action: a.windowTitle ? `${a.appName} - ${a.windowTitle}` : a.appName,
    time: formatRelativeTime(a.startTime),
    status:
      a.category === 'PRODUCTIVE'
        ? 'success'
        : a.category === 'DISTRACTION'
          ? 'warning'
          : 'info',
  }))

  return NextResponse.json({
    company: company ?? null,
    metrics,
    employees,
    weeklyTrend,
    devices: devices.map((d) => ({
      ...d,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    })),
    activities,
    companies,
  })
}
