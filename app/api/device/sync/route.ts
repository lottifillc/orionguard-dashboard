import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = "nodejs";

interface SyncPayload {
  deviceId: string
  companyId: string
  branchId: string
  loginEvents: unknown[]
  sessions: unknown[]
  activities: unknown[]
  idleLogs: unknown[]
  screenshots: unknown[]
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function parseLoginReason(value: unknown): string {
  if (value === 'SUPERVISOR' || value === 'ADMIN_OVERRIDE') return value
  return 'NORMAL'
}

function parseActivityCategory(value: unknown): string | null {
  if (value === 'PRODUCTIVE' || value === 'NEUTRAL' || value === 'DISTRACTION') return value
  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const payload = body as Partial<SyncPayload>

    if (!payload.deviceId || typeof payload.deviceId !== 'string') {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    if (!payload.companyId || typeof payload.companyId !== 'string') {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const deviceId = payload.deviceId
    const companyId = payload.companyId
    const loginEvents = Array.isArray(payload.loginEvents) ? payload.loginEvents : []
    const sessions = Array.isArray(payload.sessions) ? payload.sessions : []
    const activities = Array.isArray(payload.activities) ? payload.activities : []
    const idleLogs = Array.isArray(payload.idleLogs) ? payload.idleLogs : []
    const screenshots = Array.isArray(payload.screenshots) ? payload.screenshots : []

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, companyId: true },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    if (device.companyId !== companyId) {
      return NextResponse.json({ error: 'Device does not belong to company' }, { status: 403 })
    }

    const inserted = {
      loginEvents: 0,
      sessions: 0,
      activities: 0,
      idleLogs: 0,
      screenshots: 0,
    }

    for (const item of loginEvents) {
      const ev = item as Record<string, unknown>
      const id = typeof ev?.id === 'string' ? ev.id : null
      const employeeCode = typeof ev?.employeeCode === 'string' ? ev.employeeCode : null
      const loginAt = parseDate(ev?.loginAt)

      if (!id || !employeeCode || !loginAt) continue

      const employee = await prisma.employee.findUnique({
        where: { companyId_employeeCode: { companyId, employeeCode } },
        select: { id: true },
      })

      if (!employee) continue

      const existing = await prisma.deviceLoginEvent.findUnique({ where: { id } })
      if (existing) continue

      const logoutAt = parseDate(ev?.logoutAt)
      const reason = parseLoginReason(ev?.reason)

      await prisma.deviceLoginEvent.create({
          data: {
            id,
            companyId,
            deviceId,
            employeeId: employee.id,
            loginAt,
            logoutAt: logoutAt ?? undefined,
            reason,
        },
      })
      inserted.loginEvents++
    }

    const insertedSessionIds = new Set<string>()

    for (const item of sessions) {
      const s = item as Record<string, unknown>
      const id = typeof s?.id === 'string' ? s.id : null
      if (!id) continue

      const existing = await prisma.session.findUnique({ where: { id } })
      if (existing) continue

      const deviceBootAt = parseDate(s?.deviceBootAt)
      const deviceShutdownAt = parseDate(s?.deviceShutdownAt)
      const loginTime = parseDate(s?.loginTime) ?? new Date()
      const employeeId = typeof s?.employeeId === 'string' ? s.employeeId : undefined

      await prisma.session.create({
          data: {
            id,
            companyId,
            deviceId,
            employeeId: employeeId ?? null,
            deviceBootAt: deviceBootAt ?? undefined,
            deviceShutdownAt: deviceShutdownAt ?? undefined,
            loginTime,
            isSystemSession: Boolean(s?.isSystemSession),
            status: s?.isActive === false ? 'ENDED' : 'ACTIVE',
        },
      })
      insertedSessionIds.add(id)
      inserted.sessions++
    }

    for (const item of activities) {
        const a = item as Record<string, unknown>
        const id = typeof a?.id === 'string' ? a.id : null
        const sessionId = typeof a?.sessionId === 'string' ? a.sessionId : null
        const appName = typeof a?.appName === 'string' ? a.appName : null
        const windowTitle = typeof a?.windowTitle === 'string' ? a.windowTitle : null
        const category = parseActivityCategory(a?.category)
        const startTime = parseDate(a?.startTime)
        const endTime = parseDate(a?.endTime)
        const durationSeconds = typeof a?.durationSeconds === 'number' ? a.durationSeconds : null

        if (!id || !sessionId || !appName || !windowTitle || !category || !startTime || !endTime || durationSeconds === null) continue

      const sessionExists =
        insertedSessionIds.has(sessionId) ||
        (await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } }))
      if (!sessionExists) continue

      const existing = await prisma.activity.findUnique({ where: { id } })
      if (existing) continue

      const url = typeof a?.url === 'string' ? a.url : undefined

      await prisma.activity.create({
          data: {
            id,
            sessionId,
            appName,
            windowTitle,
            url,
            category,
            startTime,
            endTime,
            durationSeconds,
        },
      })
      inserted.activities++
    }

    for (const item of idleLogs) {
        const i = item as Record<string, unknown>
        const id = typeof i?.id === 'string' ? i.id : null
        const sessionId = typeof i?.sessionId === 'string' ? i.sessionId : null
        const startTime = parseDate(i?.startTime)
        const endTime = parseDate(i?.endTime)
        const durationSeconds = typeof i?.durationSeconds === 'number' ? i.durationSeconds : null

        if (!id || !sessionId || !startTime || !endTime || durationSeconds === null) continue

      const sessionExists =
        insertedSessionIds.has(sessionId) ||
        (await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } }))
      if (!sessionExists) continue

      const existing = await prisma.idleLog.findUnique({ where: { id } })
      if (existing) continue

      await prisma.idleLog.create({
          data: {
            id,
            sessionId,
            startTime,
            endTime,
            durationSeconds,
        },
      })
      inserted.idleLogs++
    }

    for (const item of screenshots) {
        const sc = item as Record<string, unknown>
        const id = typeof sc?.id === 'string' ? sc.id : null
        const sessionId = typeof sc?.sessionId === 'string' ? sc.sessionId : null
        const filePath = typeof sc?.filePath === 'string' ? sc.filePath : null
        const capturedAt = parseDate(sc?.capturedAt)

        if (!id || !sessionId || !filePath || !capturedAt) continue

      const sessionExists =
        insertedSessionIds.has(sessionId) ||
        (await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } }))
      if (!sessionExists) continue

      const existing = await prisma.screenshot.findUnique({ where: { id } })
      if (existing) continue

      await prisma.screenshot.create({
          data: {
            id,
            sessionId,
            filePath,
            capturedAt,
        },
      })
      inserted.screenshots++
    }

    return NextResponse.json({
      success: true,
      inserted,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
