import {
  getOverviewMetrics,
  getEmployeeProductivity,
  getWeeklyProductivityTrend,
  getDeviceStatus,
  getRecentActivity,
} from '@/src/lib/analytics/overview.service'
import { prisma } from '@/lib/prisma'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let companyId = searchParams.get('companyId')
  const startStr = searchParams.get('start')
  const endStr = searchParams.get('end')

  if (!companyId) {
    const first = await prisma.company.findFirst({ select: { id: true } })
    companyId = first?.id ?? ''
  }

  if (!companyId) {
    return Response.json({
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

  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const [metrics, employees, weeklyTrend, devices, activities] = await Promise.all([
    getOverviewMetrics(companyId, dateRange),
    getEmployeeProductivity(companyId, dateRange),
    getWeeklyProductivityTrend(companyId),
    getDeviceStatus(companyId),
    getRecentActivity(companyId),
  ])

  return Response.json({
    metrics,
    employees,
    weeklyTrend,
    devices,
    activities,
    companies,
  })
}
