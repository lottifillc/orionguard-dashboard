import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendUnblockInputCommand } from '@/lib/device-commands'

export const runtime = 'nodejs'

/**
 * POST /api/device/unblock-input
 * Unblock mouse and keyboard input on the device.
 * Body: { deviceId: string }
 */
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

    try {
      await sendUnblockInputCommand(device.id)
    } catch {
      return NextResponse.json(
        { error: 'Device offline' },
        { status: 400 }
      )
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { inputBlocked: false },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to unblock input' },
      { status: 500 }
    )
  }
}
