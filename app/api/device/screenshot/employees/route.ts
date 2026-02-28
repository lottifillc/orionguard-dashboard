import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/device/screenshot/employees?deviceId=xxx
 * Returns distinct employees who have screenshots for the device (for filter dropdown)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

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
      select: { id: true },
    })

    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 })
    }

    const sessions = await prisma.session.findMany({
      where: {
        deviceId: device.id,
        employeeId: { not: null },
        screenshots: { some: {} },
      },
      select: {
        employeeId: true,
        employee: {
          select: { id: true, employeeCode: true, fullName: true },
        },
      },
      distinct: ['employeeId'],
    })

    const employees = sessions
      .filter((s) => s.employee)
      .map((s) => ({
        id: s.employee!.id,
        employeeCode: s.employee!.employeeCode,
        fullName: s.employee!.fullName,
      }))

    return NextResponse.json({ success: true, data: employees })
  } catch (e) {
    console.error('[API] Screenshot employees error:', e)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}
