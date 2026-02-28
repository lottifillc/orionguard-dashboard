import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendUnlockCommand } from '@/lib/device-commands'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const deviceId = body?.deviceId

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
        data: { deviceId: device.id, eventType: 'REMOTE_UNLOCK' },
      }),
      prisma.device.update({
        where: { id: device.id },
        data: { isDisabled: false, lastEmergencyUnlockAt: null },
      }),
    ])

    await sendUnlockCommand(deviceId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to enable device' },
      { status: 500 }
    )
  }
}
