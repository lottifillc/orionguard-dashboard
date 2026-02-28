import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  sendLockCommand,
  sendUnlockCommand,
  sendScreenshotCommand,
} from '@/lib/device-commands'

export const runtime = 'nodejs'

type Command = 'LOCK' | 'UNLOCK' | 'CAPTURE_SCREEN'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const deviceId = body?.deviceId
    const command = body?.command as Command | undefined

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      )
    }

    if (!command || !['LOCK', 'UNLOCK', 'CAPTURE_SCREEN'].includes(command)) {
      return NextResponse.json(
        { success: false, error: 'command must be LOCK, UNLOCK, or CAPTURE_SCREEN' },
        { status: 400 }
      )
    }

    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
      },
      select: { id: true, deviceIdentifier: true },
    })

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }

    let sent = false
    try {
      if (command === 'LOCK') {
        sent = await sendLockCommand(device.id)
      } else if (command === 'UNLOCK') {
        sent = await sendUnlockCommand(device.id)
      } else if (command === 'CAPTURE_SCREEN') {
        console.log('[API] CAPTURE_SCREEN requested for:', deviceId)
        sent = await sendScreenshotCommand(device.id)
        console.log('[API] CAPTURE_SCREEN sent:', sent, '-> success:', sent)
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Device not connected' },
        { status: 400 }
      )
    }

    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Device not connected' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send command'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
