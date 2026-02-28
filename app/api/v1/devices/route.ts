import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync } from 'fs'
import { toWebUrl, toAbsolutePath } from '@/lib/screenshot-paths'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const deviceWhere = companyId ? { companyId } : undefined
    const sessionDeviceFilter = companyId ? { companyId } : {}

    const [devices, activeSessionsByDevice, sessionsWithCounts, lastScreenshots] =
      await Promise.all([
        prisma.device.findMany({
          where: deviceWhere,
          select: {
            id: true,
            deviceIdentifier: true,
            deviceName: true,
            isOnline: true,
            lastSeenAt: true,
            createdAt: true,
            isDisabled: true,
            lastEmergencyUnlockAt: true,
            company: { select: { name: true } },
            _count: { select: { sessions: true } },
            sessions: {
              orderBy: { loginTime: 'desc' },
              take: 1,
              select: {
                employee: {
                  select: { fullName: true, employeeCode: true },
                },
                loginTime: true,
              },
            },
          },
          orderBy: { deviceName: 'asc' },
        }),
        prisma.session.groupBy({
          by: ['deviceId'],
          _count: { id: true },
          where: { ...(companyId ? { companyId } : {}), status: 'ACTIVE' },
        }),
        prisma.session.findMany({
          where: { device: sessionDeviceFilter },
          select: {
            deviceId: true,
            _count: { select: { activities: true } },
            activities: {
              orderBy: { startTime: 'desc' },
              take: 1,
              select: { startTime: true },
            },
          },
        }),
        prisma.screenshot.findMany({
          where: { session: { device: sessionDeviceFilter } },
          orderBy: { capturedAt: 'desc' },
          select: {
            filePath: true,
            capturedAt: true,
            session: { select: { deviceId: true } },
          },
        }),
      ])

    const activeMap = Object.fromEntries(
      activeSessionsByDevice.map((s) => [s.deviceId, s._count.id])
    )

    const activitiesByDevice = new Map<string, { count: number; lastAt: Date | null }>()
    for (const s of sessionsWithCounts) {
      const existing = activitiesByDevice.get(s.deviceId)
      const count = (existing?.count ?? 0) + s._count.activities
      const sessionLastAt = s.activities[0]?.startTime ?? null
      const lastAt =
        !existing?.lastAt
          ? sessionLastAt
          : sessionLastAt && sessionLastAt > existing.lastAt
            ? sessionLastAt
            : existing.lastAt
      activitiesByDevice.set(s.deviceId, { count, lastAt })
    }

    const screenshotByDevice = new Map<
      string,
      { fileUrl: string; capturedAt: Date }
    >()
    for (const sc of lastScreenshots) {
      const did = sc.session.deviceId
      if (!screenshotByDevice.has(did)) {
        const fileUrl = toWebUrl(sc.filePath)
        const fullPath = toAbsolutePath(sc.filePath)
        if (existsSync(fullPath)) {
          screenshotByDevice.set(did, { fileUrl, capturedAt: sc.capturedAt })
        }
      }
    }

    const result = devices.map((d) => {
      const latestSession = d.sessions[0]
      const emp = latestSession?.employee
      const { count: totalActivities, lastAt: lastActivityTime } =
        activitiesByDevice.get(d.id) ?? { count: 0, lastAt: null }

      return {
        id: d.id,
        deviceIdentifier: d.deviceIdentifier,
        deviceName: d.deviceName,
        isOnline: d.isOnline,
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        isDisabled: d.isDisabled,
        lastEmergencyUnlockAt: d.lastEmergencyUnlockAt?.toISOString() ?? null,
        company: d.company,
        totalSessionsCount: d._count.sessions,
        totalActivitiesCount: totalActivities,
        activeSessionsCount: activeMap[d.id] ?? 0,
        lastEmployee: emp
          ? { fullName: emp.fullName, employeeCode: emp.employeeCode }
          : null,
        lastActivityTime: lastActivityTime?.toISOString() ?? null,
        lastScreenshotFilePath: screenshotByDevice.get(d.id)?.fileUrl ?? null,
        latestScreenshot:
          screenshotByDevice.get(d.id) != null
            ? {
                fileUrl: screenshotByDevice.get(d.id)!.fileUrl,
                capturedAt: screenshotByDevice.get(d.id)!.capturedAt.toISOString(),
              }
            : null,
      }
    })

    const summary = {
      totalDevices: result.length,
      onlineDevices: result.filter((d) => d.isOnline).length,
      lockedDevices: result.filter((d) => d.isDisabled).length,
      activeSessionsNow: result.reduce((sum, d) => sum + d.activeSessionsCount, 0),
    }

    return NextResponse.json({ devices: result, summary })
  } catch (e) {
    console.error('Devices API error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}
