import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync } from 'fs'
import { toWebUrl, toAbsolutePath } from '@/lib/screenshot-paths'

export const runtime = 'nodejs'

/**
 * GET /api/v1/devices/[deviceId]
 * Returns a single device with full details.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params

    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
      },
      select: {
        id: true,
        deviceIdentifier: true,
        deviceName: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
        isDisabled: true,
        lastEmergencyUnlockAt: true,
        inputBlocked: true,
        company: { select: { name: true } },
        emergencyPinConfigs: { take: 1, select: { id: true } },
        _count: { select: { sessions: true } },
        sessions: {
          orderBy: { loginTime: 'desc' },
          take: 1,
          select: {
            employee: { select: { fullName: true, employeeCode: true } },
            loginTime: true,
          },
        },
      },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const [activeSessions, lastScreenshot] = await Promise.all([
      prisma.session.count({
        where: { deviceId: device.id, status: 'ACTIVE' },
      }),
      prisma.screenshot.findFirst({
        where: { session: { deviceId: device.id } },
        orderBy: { capturedAt: 'desc' },
        select: { filePath: true, capturedAt: true },
      }),
    ])

    const latestSession = device.sessions[0]
    const emp = latestSession?.employee
    let latestScreenshot: { fileUrl: string; capturedAt: string } | null = null
    if (lastScreenshot) {
      const fileUrl = toWebUrl(lastScreenshot.filePath)
      const fullPath = toAbsolutePath(lastScreenshot.filePath)
      if (existsSync(fullPath)) {
        latestScreenshot = {
          fileUrl,
          capturedAt: lastScreenshot.capturedAt.toISOString(),
        }
      }
    }

    return NextResponse.json({
      id: device.id,
      deviceIdentifier: device.deviceIdentifier,
      deviceName: device.deviceName,
      isOnline: device.isOnline,
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      createdAt: device.createdAt.toISOString(),
      isDisabled: device.isDisabled,
      lastEmergencyUnlockAt: device.lastEmergencyUnlockAt?.toISOString() ?? null,
      inputBlocked: device.inputBlocked,
      emergencyPinConfigured: (device.emergencyPinConfigs?.length ?? 0) > 0,
      company: device.company,
      totalSessionsCount: device._count.sessions,
      activeSessionsCount: activeSessions,
      lastEmployee: emp
        ? { fullName: emp.fullName, employeeCode: emp.employeeCode }
        : null,
      latestScreenshot,
    })
  } catch (e) {
    console.error('Device API error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch device' },
      { status: 500 }
    )
  }
}
