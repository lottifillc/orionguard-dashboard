import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendSetEmergencyPinCommand } from '@/lib/device-commands'

export const runtime = 'nodejs'

const PIN_MIN_LENGTH = 4
const PIN_MAX_LENGTH = 8
const PIN_REGEX = /^\d+$/

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex').toLowerCase()
}

/**
 * GET /api/device/emergency-pin/[deviceId]
 * Returns whether emergency PIN is configured for the device.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params

    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
      },
      select: { id: true },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const config = await prisma.emergencyPinConfig.findUnique({
      where: { deviceId: device.id },
      select: { configuredAt: true },
    })

    return NextResponse.json({
      configured: !!config,
      configuredAt: config?.configuredAt?.toISOString() ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get emergency PIN status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/device/emergency-pin/[deviceId]
 * Set emergency unlock PIN for the device.
 * Body: { pin: string, confirmPin: string }
 * PIN is hashed with SHA256 before storage and transmission. Plain PIN is never stored.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    const body = await request.json()
    const pin = body?.pin
    const confirmPin = body?.confirmPin

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'pin is required' },
        { status: 400 }
      )
    }

    if (!confirmPin || typeof confirmPin !== 'string') {
      return NextResponse.json(
        { error: 'confirmPin is required' },
        { status: 400 }
      )
    }

    if (pin !== confirmPin) {
      return NextResponse.json(
        { error: 'PIN and confirm PIN do not match' },
        { status: 400 }
      )
    }

    if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
      return NextResponse.json(
        { error: `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits` },
        { status: 400 }
      )
    }

    if (!PIN_REGEX.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must contain only digits' },
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
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const pinHash = hashPin(pin)

    await prisma.emergencyPinConfig.upsert({
      where: { deviceId: device.id },
      create: {
        deviceId: device.id,
        pinHash,
      },
      update: { pinHash, configuredAt: new Date() },
    })

    let sentToDevice = false
    try {
      await sendSetEmergencyPinCommand(device.id, pinHash)
      sentToDevice = true
    } catch {
      // Device offline - PIN saved, will need to be sent when device reconnects
      // TODO: Implement command queue for offline devices
    }

    return NextResponse.json({
      success: true,
      sentToDevice,
      message: sentToDevice
        ? 'PIN configured and sent to device'
        : 'PIN saved. It will need to be sent when the device reconnects.',
    })
  } catch (err) {
    console.error('[Emergency PIN] Error:', err)
    return NextResponse.json(
      { error: 'Failed to set emergency PIN' },
      { status: 500 }
    )
  }
}
