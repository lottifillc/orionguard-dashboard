import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deviceConnections } from '@/lib/ws-connection-store'

export const runtime = 'nodejs'

/**
 * Returns device IDs (cuid) that have an active WebSocket connection AND isOnline=true in DB.
 * UI polls every 5 seconds for real-time Live/Offline status.
 * Excludes devices marked offline by heartbeat timeout (e.g. after client closed abruptly).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const connectedIdentifiers = Array.from(deviceConnections.keys()).filter(
      (id) => {
        const ws = deviceConnections.get(id)
        return ws && ws.readyState === 1 /* OPEN */
      }
    )

    if (connectedIdentifiers.length === 0) {
      return NextResponse.json({ connected: [] })
    }

    const devices = await prisma.device.findMany({
      where: {
        deviceIdentifier: { in: connectedIdentifiers },
        isOnline: true,
        ...(companyId ? { companyId } : {}),
      },
      select: { id: true },
    })

    const connected = devices.map((d) => d.id)
    return NextResponse.json({ connected })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get live status' },
      { status: 500 }
    )
  }
}
