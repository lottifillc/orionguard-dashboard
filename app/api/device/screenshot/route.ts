import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendScreenshotCommand } from '@/lib/device-commands'

export const runtime = 'nodejs'

async function handleScreenshotRequest(deviceId: string | null) {
  if (!deviceId) {
    return NextResponse.json(
      { success: false, error: 'deviceId is required' },
      { status: 400 }
    )
  }

  const device = await prisma.device.findFirst({
    where: {
      OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
    },
    select: { id: true, isOnline: true },
  })

  if (!device) {
    return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 })
  }

  if (!device.isOnline) {
    return NextResponse.json(
      { error: 'Device is offline. Cannot take screenshot.' },
      { status: 400 }
    )
  }

  console.log('Sending screenshot command to device:', deviceId)
  const sent = await sendScreenshotCommand(device.id)
  if (!sent) {
    return NextResponse.json(
      { success: false, error: 'Device not connected via WebSocket' },
      { status: 503 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { message: 'Screenshot request sent to device' },
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    return handleScreenshotRequest(deviceId)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to request screenshot' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const deviceId = (body?.deviceId ?? null) as string | null
    return handleScreenshotRequest(deviceId)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to request screenshot' },
      { status: 500 }
    )
  }
}
