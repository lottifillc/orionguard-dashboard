import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/device/status?deviceId=...
 * Returns device status for startup check.
 * Desktop client should call this on startup and show LockWindow if isDisabled.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

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
      select: { isDisabled: true },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    return NextResponse.json({ isDisabled: device.isDisabled })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch device status' },
      { status: 500 }
    )
  }
}
