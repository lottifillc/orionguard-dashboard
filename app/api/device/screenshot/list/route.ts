import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function parseDate(value: string | null): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
    const from = parseDate(searchParams.get('from'))
    const to = parseDate(searchParams.get('to'))
    const employeeId = searchParams.get('employeeId') || undefined

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      )
    }

    // Validate device exists (security: ensure device is accessible)
    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
      },
      select: { id: true, deviceName: true, deviceIdentifier: true },
    })

    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 })
    }

    const where: {
      session: {
        deviceId: string
        employeeId?: string | null
      }
      capturedAt?: { gte?: Date; lte?: Date }
    } = {
      session: {
        deviceId: device.id,
      },
    }

    if (employeeId) {
      where.session.employeeId = employeeId
    }

    if (from || to) {
      where.capturedAt = {}
      if (from) where.capturedAt.gte = from
      if (to) {
        const toEnd = new Date(to)
        toEnd.setHours(23, 59, 59, 999)
        where.capturedAt.lte = toEnd
      }
    }

    const [screenshots, totalCount] = await Promise.all([
      prisma.screenshot.findMany({
        where,
        orderBy: { capturedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          sessionId: true,
          filePath: true,
          capturedAt: true,
          session: {
            select: {
              deviceId: true,
              employeeId: true,
              device: { select: { deviceName: true, deviceIdentifier: true } },
              employee: { select: { employeeCode: true, fullName: true } },
            },
          },
        },
      }),
      prisma.screenshot.count({ where }),
    ])

    const fileName = (fp: string) => {
      const parts = fp.split('/')
      return parts[parts.length - 1] || fp
    }

    const data = screenshots.map((s) => {
      const fn = fileName(s.filePath)
      const fileUrl = `/live-screenshots/${fn}`
      return {
        id: s.id,
        deviceId: s.session.deviceId,
        deviceName: s.session.device.deviceName,
        deviceIdentifier: s.session.device.deviceIdentifier,
        employeeId: s.session.employeeId,
        employeeCode: s.session.employee?.employeeCode ?? null,
        employeeName: s.session.employee?.fullName ?? null,
        sessionId: s.sessionId,
        fileName: fn,
        fileUrl,
        fileSize: null,
        width: null,
        height: null,
        createdAt: s.capturedAt.toISOString(),
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        totalPages,
        totalCount,
      },
    })
  } catch (e) {
    console.error('[API] Screenshot list error:', e)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch screenshots' },
      { status: 500 }
    )
  }
}
