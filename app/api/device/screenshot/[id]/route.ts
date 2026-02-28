import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { toAbsolutePath } from '@/lib/screenshot-paths'

export const runtime = 'nodejs'

/**
 * DELETE /api/device/screenshot/[id]
 * Deletes a screenshot. Role-based protection: in production, validate user has
 * ADMIN or SUPERVISOR role before allowing. For now, validates screenshot
 * belongs to a valid device.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Screenshot ID is required' },
        { status: 400 }
      )
    }

    const screenshot = await prisma.screenshot.findUnique({
      where: { id },
      select: {
        id: true,
        filePath: true,
        session: {
          select: {
            deviceId: true,
            device: { select: { companyId: true } },
          },
        },
      },
    })

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      )
    }

    // Security: device validation (company scoping can be added when auth exists)
    if (!screenshot.session?.deviceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid screenshot' },
        { status: 400 }
      )
    }

    // TODO: Add role check when auth is implemented:
    // if (userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') return 403

    const fullPath = toAbsolutePath(screenshot.filePath)

    try {
      await unlink(fullPath)
    } catch {
      // File may already be missing; continue with DB delete
    }

    await prisma.screenshot.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    console.error('[API] Screenshot delete error:', e)
    return NextResponse.json(
      { success: false, error: 'Failed to delete screenshot' },
      { status: 500 }
    )
  }
}
