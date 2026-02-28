import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

const LIVE_SCREENSHOTS_DIR = join(process.cwd(), 'public', 'live-screenshots')

function ensureDir(): void {
  if (!existsSync(LIVE_SCREENSHOTS_DIR)) {
    mkdirSync(LIVE_SCREENSHOTS_DIR, { recursive: true })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const deviceId = formData.get('deviceId') as string | null
    const file = formData.get('file') as File | null

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      )
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'file is required' },
        { status: 400 }
      )
    }

    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
      },
      select: { id: true, companyId: true, deviceIdentifier: true },
    })

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }

    ensureDir()
    const timestamp = Date.now()
    const safeIdentifier = device.deviceIdentifier.replace(/[^a-zA-Z0-9-_]/g, '_')
    const fileName = `${safeIdentifier}-${timestamp}.png`
    const absolutePath = join(LIVE_SCREENSHOTS_DIR, fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    writeFileSync(absolutePath, buffer)

    let session = await prisma.session.findFirst({
      where: { deviceId: device.id, status: 'ACTIVE' },
      orderBy: { loginTime: 'desc' },
      select: { id: true },
    })

    if (!session) {
      session = await prisma.session.create({
        data: {
          companyId: device.companyId,
          deviceId: device.id,
          isSystemSession: true,
          status: 'ACTIVE',
        },
        select: { id: true },
      })
    }

    await prisma.screenshot.create({
      data: {
        sessionId: session.id,
        deviceId: device.id,
        filePath: fileName,
        capturedAt: new Date(timestamp),
      },
    })

    return NextResponse.json({
      success: true,
      data: { fileName, timestamp },
    })
  } catch (e) {
    console.error('[upload-screenshot]', e)
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}
