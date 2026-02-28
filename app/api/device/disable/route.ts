import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    await prisma.device.update({
      where: { id: deviceId },
      data: { isDisabled: true },
    })

    return NextResponse.json({ success: true, message: 'Device disabled' })
  } catch {
    return NextResponse.json(
      { error: 'Failed to disable device' },
      { status: 500 }
    )
  }
}
