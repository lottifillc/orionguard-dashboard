import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * POST: Device reports EMERGENCY_UNLOCK (e.g. user unlocked locally via PIN).
 * Called by the desktop client when emergency local unlock is performed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const deviceId = body?.deviceId ?? body?.deviceIdentifier

    if (!deviceId || typeof deviceId !== 'string') {
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

    await prisma.$transaction([
      prisma.deviceEvent.create({
        data: {
          deviceId: device.id,
          eventType: 'EMERGENCY_UNLOCK',
        },
      }),
      prisma.device.update({
        where: { id: device.id },
        data: {
          isDisabled: false,
          lastEmergencyUnlockAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to record emergency unlock' },
      { status: 500 }
    )
  }
}
