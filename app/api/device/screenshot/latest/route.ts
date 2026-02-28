import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdirSync } from 'fs'
import { LIVE_SCREENSHOTS_DIR, toWebUrl } from '@/lib/screenshot-paths'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    let device: { id: string; deviceIdentifier: string } | null = null
    try {
      device = await withTimeout(
        prisma.device.findFirst({
          where: {
            OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
          },
          select: { id: true, deviceIdentifier: true },
        }),
        DB_TIMEOUT_MS
      )
    } catch (e) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200, headers: NO_CACHE_HEADERS }
      )
    }

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    let latestFromDb: { id: string; filePath: string; capturedAt: Date } | null = null
    try {
      latestFromDb = await withTimeout(
        prisma.screenshot.findFirst({
          where: {
            OR: [{ deviceId: device.id }, { session: { deviceId: device.id } }],
          },
          orderBy: [
            { capturedAt: 'desc' },
            { id: 'desc' },
          ],
          select: { id: true, filePath: true, capturedAt: true },
        }),
        DB_TIMEOUT_MS
      )
    } catch (e) {
      latestFromDb = null
    }

    let filePath: string | null = null
    let capturedAt: string | null = null

    if (latestFromDb?.filePath) {
      filePath = latestFromDb.filePath
      capturedAt = latestFromDb.capturedAt.toISOString()
    } else {
      let latestFile: string | null = null
      let latestTs = 0
      const prefix = `${device.deviceIdentifier}-`

      try {
        const files = readdirSync(LIVE_SCREENSHOTS_DIR)
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
        if (latestFile) {
          filePath = latestFile
          capturedAt = new Date(latestTs).toISOString()
        }
      } catch {
        // Directory may not exist
      }
    }

    if (filePath) {
      const url = `${toWebUrl(filePath)}?t=${Date.now()}`
      const responseData = {
        id: latestFromDb?.id ?? null,
        url,
        imageUrl: url,
        capturedAt,
        filePath,
      }
      return NextResponse.json(
        { success: true, data: responseData },
        { status: 200, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { success: true, data: null },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (e) {
    console.error('[API] Latest screenshot error:', e)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch latest screenshot' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
