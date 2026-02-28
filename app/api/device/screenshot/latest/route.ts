import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdirSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

const DB_TIMEOUT_MS = 2000
const FILESYSTEM_FALLBACK_LIMIT = 50

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), ms)
    ),
  ])
}

function toFileUrl(filePath: string): string {
  const fileName = filePath.includes('/') ? filePath.split('/').pop() ?? filePath : filePath
  return `/live-screenshots/${fileName}`
}

export async function GET(request: Request) {
  console.log('[API] START latest lookup')
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      )
    }

    let device: { id: string; deviceIdentifier: string } | null = null
    try {
      device = await withTimeout(
        prisma.device.findUnique({
          where: { id: deviceId },
          select: { id: true, deviceIdentifier: true },
        }),
        DB_TIMEOUT_MS
      )
    } catch (e) {
      console.log('[API] FALLBACK triggered - device lookup failed:', (e as Error).message)
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      )
    }

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }

    let latestFromDb: { id: string; filePath: string; capturedAt: Date } | null = null
    try {
      latestFromDb = await withTimeout(
        prisma.screenshot.findFirst({
          where: { session: { deviceId: device.id } },
          orderBy: { capturedAt: 'desc' },
          select: { id: true, filePath: true, capturedAt: true },
        }),
        DB_TIMEOUT_MS
      )
    } catch (e) {
      console.log('[API] FALLBACK triggered - DB query failed:', (e as Error).message)
      latestFromDb = null
    }

    if (latestFromDb?.filePath) {
      console.log('[API] DB result found:', latestFromDb.id)
      const url = toFileUrl(latestFromDb.filePath)
      const payload = {
        success: true,
        data: {
          url,
          capturedAt: latestFromDb.capturedAt.toISOString(),
        },
      }
      console.log('[API] RESPONSE sent (from DB)')
      return NextResponse.json(payload, { status: 200 })
    }

    console.log('[API] DB result not found, falling back to filesystem')
    let latestFile: string | null = null
    let latestTs = 0
    const prefix = `${device.deviceIdentifier}-`

    try {
      const screenshotsDir = join(process.cwd(), 'public', 'live-screenshots')
      const files = readdirSync(screenshotsDir)
      let scanned = 0
      for (const f of files) {
        if (!f.startsWith(prefix) || !f.endsWith('.png')) continue
        if (++scanned > FILESYSTEM_FALLBACK_LIMIT) break
        const ts = parseInt(f.replace(prefix, '').replace('.png', ''), 10)
        if (!isNaN(ts) && ts > latestTs) {
          latestTs = ts
          latestFile = f
        }
      }
    } catch {
      // Directory may not exist
    }

    if (latestFile) {
      console.log('[API] Found screenshot from filesystem:', latestFile)
      const payload = {
        success: true,
        data: {
          url: `/live-screenshots/${latestFile}`,
          capturedAt: new Date(latestTs).toISOString(),
        },
      }
      console.log('[API] RESPONSE sent (from filesystem)')
      return NextResponse.json(payload, { status: 200 })
    }

    console.log('[API] No screenshot found, returning data: null')
    console.log('[API] RESPONSE sent (empty)')
    return NextResponse.json({ success: true, data: null }, { status: 200 })
  } catch (e) {
    console.error('[API] Latest screenshot error:', e)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch latest screenshot' },
      { status: 500 }
    )
  }
}
