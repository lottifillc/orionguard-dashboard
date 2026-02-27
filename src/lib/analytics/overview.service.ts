import { prisma } from '@/lib/prisma'

export type DateRange = { start: Date; end: Date }

export type OverviewMetrics = {
  totalEmployees: number
  totalDevices: number
  onlineDevices: number
  totalSessions: number
  activeMinutes: number
  idleMinutes: number
  productivityPercentage: number
}

export type EmployeeProductivity = {
  fullName: string
  totalActiveMinutes: number
  totalIdleMinutes: number
  productivityPercentage: number
  riskScore: 'HIGH' | 'MEDIUM' | 'LOW'
}

export type WeeklyTrendItem = {
  date: string
  totalActiveMinutes: number
  totalIdleMinutes: number
  productivityPercentage: number
}

export type DeviceStatus = {
  deviceName: string
  isOnline: boolean
  lastSeenAt: Date | null
  totalSessions: number
  totalActiveMinutes: number
}

export type RecentActivity = {
  id: string
  user: string
  action: string
  time: string
  status: 'success' | 'error' | 'warning' | 'info'
}

function getRiskScore(productivityPercentage: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (productivityPercentage < 40) return 'HIGH'
  if (productivityPercentage < 60) return 'MEDIUM'
  return 'LOW'
}

export async function getOverviewMetrics(
  companyId: string,
  dateRange: DateRange
): Promise<OverviewMetrics> {
  const [employeeCount, deviceRows, sessionAgg] = await Promise.all([
    prisma.employee.count({ where: { companyId } }),
    prisma.$queryRaw<{ total: bigint; online: bigint }[]>`
      SELECT 
        COUNT(*)::bigint as total,
        COALESCE(SUM(CASE WHEN "isOnline" = true THEN 1 ELSE 0 END), 0)::bigint as online
      FROM "Device"
      WHERE "companyId" = ${companyId}
    `,
    prisma.session.aggregate({
      where: {
        employee: { companyId },
        loginTime: { gte: dateRange.start, lte: dateRange.end },
      },
      _sum: { totalActiveSeconds: true, totalIdleSeconds: true },
      _count: { id: true },
    }),
  ])

  const totalDevices = Number(deviceRows[0]?.total ?? 0)
  const onlineDevices = Number(deviceRows[0]?.online ?? 0)

  const activeSeconds = sessionAgg._sum.totalActiveSeconds ?? 0
  const idleSeconds = sessionAgg._sum.totalIdleSeconds ?? 0
  const totalSeconds = activeSeconds + idleSeconds

  return {
    totalEmployees: employeeCount,
    totalDevices,
    onlineDevices,
    totalSessions: sessionAgg._count.id,
    activeMinutes: Math.round(activeSeconds / 60),
    idleMinutes: Math.round(idleSeconds / 60),
    productivityPercentage:
      totalSeconds === 0 ? 0 : Math.round((activeSeconds / totalSeconds) * 100),
  }
}

export async function getEmployeeProductivity(
  companyId: string,
  dateRange: DateRange
): Promise<EmployeeProductivity[]> {
  const sessions = await prisma.session.groupBy({
    by: ['employeeId'],
    where: {
      employee: { companyId },
      loginTime: { gte: dateRange.start, lte: dateRange.end },
    },
    _sum: { totalActiveSeconds: true, totalIdleSeconds: true },
  })

  const employeeIds = [...new Set(sessions.map((s) => s.employeeId))]
  const employees =
    employeeIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, fullName: true },
        })
      : []

  const empMap = Object.fromEntries(employees.map((e) => [e.id, e.fullName]))

  return sessions.map((s) => {
    const activeSeconds = s._sum.totalActiveSeconds ?? 0
    const idleSeconds = s._sum.totalIdleSeconds ?? 0
    const totalSeconds = activeSeconds + idleSeconds
    const productivityPercentage =
      totalSeconds === 0 ? 0 : (activeSeconds / totalSeconds) * 100

    return {
      fullName: empMap[s.employeeId] ?? '',
      totalActiveMinutes: Math.round(activeSeconds / 60),
      totalIdleMinutes: Math.round(idleSeconds / 60),
      productivityPercentage: Math.round(productivityPercentage),
      riskScore: getRiskScore(productivityPercentage),
    }
  })
}

export async function getWeeklyProductivityTrend(
  companyId: string
): Promise<WeeklyTrendItem[]> {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  const rows = await prisma.$queryRaw<
    { day: Date; total_active: bigint; total_idle: bigint }[]
  >`
    SELECT 
      (s."loginTime"::date) as day,
      COALESCE(SUM(s."totalActiveSeconds"), 0)::bigint as total_active,
      COALESCE(SUM(s."totalIdleSeconds"), 0)::bigint as total_idle
    FROM "Session" s
    INNER JOIN "Employee" e ON s."employeeId" = e.id
    WHERE e."companyId" = ${companyId}
      AND s."loginTime" >= ${start}
      AND s."loginTime" <= ${end}
    GROUP BY (s."loginTime"::date)
    ORDER BY day ASC
  `

  const result: WeeklyTrendItem[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const row = rows.find(
      (r) => r.day && new Date(r.day).toISOString().slice(0, 10) === dateStr
    )
    const active = Number(row?.total_active ?? 0)
    const idle = Number(row?.total_idle ?? 0)
    const total = active + idle

    result.push({
      date: dateStr,
      totalActiveMinutes: Math.round(active / 60),
      totalIdleMinutes: Math.round(idle / 60),
      productivityPercentage: total === 0 ? 0 : Math.round((active / total) * 100),
    })
  }

  return result
}

export async function getDeviceStatus(
  companyId: string
): Promise<DeviceStatus[]> {
  const devices = await prisma.$queryRaw<
    { id: string; deviceName: string; isOnline: boolean; lastSeenAt: Date | null }[]
  >`
    SELECT id, "deviceName", "isOnline", "lastSeenAt"
    FROM "Device"
    WHERE "companyId" = ${companyId}
  `

  const deviceIds = devices.map((d) => d.id)

  const sessionAgg =
    deviceIds.length > 0
      ? await prisma.session.groupBy({
          by: ['deviceId'],
          where: { deviceId: { in: deviceIds } },
          _sum: { totalActiveSeconds: true },
          _count: { id: true },
        })
      : []

  const aggMap = Object.fromEntries(
    sessionAgg.map((s) => [
      s.deviceId,
      {
        totalSessions: s._count.id,
        totalActiveMinutes: Math.round((s._sum.totalActiveSeconds ?? 0) / 60),
      },
    ])
  )

  return devices.map((d) => {
    const agg = aggMap[d.id] ?? { totalSessions: 0, totalActiveMinutes: 0 }
    return {
      deviceName: d.deviceName,
      isOnline: d.isOnline,
      lastSeenAt: d.lastSeenAt,
      totalSessions: agg.totalSessions,
      totalActiveMinutes: agg.totalActiveMinutes,
    }
  })
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

export async function getRecentActivity(
  companyId: string,
  limit = 10
): Promise<RecentActivity[]> {
  const sessions = await prisma.session.findMany({
    where: { employee: { companyId } },
    orderBy: { loginTime: 'desc' },
    take: limit,
    include: {
      employee: { select: { fullName: true } },
      device: { select: { deviceName: true } },
    },
  })

  return sessions.map((s) => ({
    id: s.id,
    user: s.employee.fullName,
    action: s.logoutTime
      ? 'أنهى جلسة العمل'
      : 'بدأ جلسة آمنة',
    time: formatRelativeTime(s.loginTime),
    status: s.status === 'ACTIVE' ? 'success' : 'info',
  }))
}
