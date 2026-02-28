import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET: Fetch device events (timeline) for a device.
 * Query: ?deviceId=xxx&limit=50
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 100)

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      )
    }

    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
      },
      select: { id: true },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const events = await prisma.deviceEvent.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch device events' },
      { status: 500 }
    )
  }
}
