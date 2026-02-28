/**
 * Desktop Client Heartbeat Simulator
 * Sends HEARTBEAT every 10 seconds. Handles LOCK_DEVICE / UNLOCK_DEVICE.
 * Handles REQUEST_LIVE_FRAME: captures NEW screenshot, uploads, sends LIVE_FRAME_READY.
 *
 * Run: npx tsx scripts/desktop-heartbeat-client.ts
 * Or integrate this logic into your actual desktop app (Electron, etc.)
 *
 * Env: WS_URL (default from NEXT_PUBLIC_WS_BASE or ws://localhost:3000/ws)
 *      API_URL (default from NEXT_PUBLIC_API_BASE or http://localhost:3000)
 *      DEVICE_ID (default ORION-DEVICE-001)
 */

import WebSocket from 'ws'
import { prisma } from '../lib/prisma'
const screenshot = require('screenshot-desktop')

const WS_URL = process.env.WS_URL ?? process.env.NEXT_PUBLIC_WS_BASE ?? 'ws://localhost:3000/ws'
const API_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '')
const DEVICE_ID = process.env.DEVICE_ID ?? 'ORION-DEVICE-001'

async function getCompanyId(deviceIdentifier: string): Promise<string | null> {
  const device = await prisma.device.findFirst({
    where: { deviceIdentifier },
    select: { companyId: true },
  })
  return device?.companyId ?? null
}

async function checkStartupStatus(): Promise<boolean> {
  try {
    const r = await fetch(`${API_URL}/api/device/status?deviceId=${encodeURIComponent(DEVICE_ID)}`)
    if (!r.ok) return false
    const data = (await r.json()) as { isDisabled?: boolean }
    return data.isDisabled === true
  } catch {
    return false
  }
}

function handleLockDevice(): void {
  console.log('[LOCK] LOCK_DEVICE received - stopping services, showing LockWindow')
}

function handleUnlockDevice(): void {
  console.log('[LOCK] UNLOCK_DEVICE received - closing LockWindow, resuming services')
}

/**
 * Capture NEW screenshot and upload to API.
 * No caching, no reuse - fresh capture every time.
 */
async function captureAndUpload(dbDeviceId: string): Promise<boolean> {
  try {
    const img = await screenshot({ format: 'png' })
    const formData = new FormData()
    formData.append('deviceId', dbDeviceId)
    formData.append('file', new Blob([new Uint8Array(img)], { type: 'image/png' }), `capture-${Date.now()}.png`)
    const r = await fetch(`${API_URL}/api/device/upload-screenshot`, {
      method: 'POST',
      body: formData,
    })
    return r.ok
  } catch (err) {
    console.error('Screenshot failed:', err)
    return false
  }
}

/**
 * Handle REQUEST_LIVE_FRAME: capture NEW screenshot, upload, send LIVE_FRAME_READY.
 */
async function handleRequestLiveFrame(ws: WebSocket, dbDeviceId: string): Promise<void> {
  try {
    const ok = await captureAndUpload(dbDeviceId)
    if (ok && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'LIVE_FRAME_READY',
          deviceId: dbDeviceId,
          timestamp: Date.now(),
        })
      )
    }
  } catch (err) {
    console.error('[LIVE_FRAME] Capture/upload failed:', err)
  }
}

/**
 * Handle CAPTURE_SCREEN command.
 */
function handleCaptureScreen(ws: WebSocket, deviceIdentifier: string): void {
  const placeholderBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: 'SCREENSHOT_RESULT',
        deviceId: deviceIdentifier,
        imageBase64: placeholderBase64,
      })
    )
  }
}

function runClient() {
  const ws = new WebSocket(WS_URL)

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let deviceIdentifier: string = DEVICE_ID
  let dbDeviceId: string = ''

  ws.on('open', () => {
    getCompanyId(DEVICE_ID).then((companyId) => {
      if (!companyId) {
        console.error('Device not found or no company. Run bootstrap first.')
        ws.close()
        return
      }
      ws.send(
        JSON.stringify({
          type: 'REGISTER',
          deviceId: DEVICE_ID,
          companyId,
        })
      )
    })
  })

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString()) as { type?: string; deviceId?: string }
      if (msg.type === 'REGISTERED') {
        deviceIdentifier = DEVICE_ID
        dbDeviceId = (msg as { deviceId?: string }).deviceId ?? DEVICE_ID
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'HEARTBEAT', deviceId: deviceIdentifier }))
          }
        }, 10_000)
      } else if (msg.type === 'REQUEST_LIVE_FRAME') {
        const targetId = msg.deviceId ?? dbDeviceId
        if (targetId) handleRequestLiveFrame(ws, targetId)
      } else if (msg.type === 'LOCK_DEVICE' || msg.type === 'LOCK') {
        handleLockDevice()
      } else if (msg.type === 'UNLOCK_DEVICE' || msg.type === 'UNLOCK') {
        handleUnlockDevice()
      } else if (msg.type === 'CAPTURE_SCREEN' || msg.type === 'TAKE_SCREENSHOT') {
        handleCaptureScreen(ws, deviceIdentifier)
      } else if (msg.type === 'ERROR') {
        console.error('Server error:', (msg as { error?: string }).error)
      }
    } catch {
      // ignore non-JSON
    }
  })

  ws.on('close', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    console.log('Disconnected. Reconnecting in 5s...')
    setTimeout(runClient, 5000)
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message)
  })
}

async function main() {
  console.log('WS URL:', WS_URL)
  console.log('API URL:', API_URL)
  console.log('Ensure both point to your production domain (e.g. https://yourdomain.com), not localhost')

  await prisma.$connect()

  const isDisabled = await checkStartupStatus()
  if (isDisabled) {
    console.log('[STARTUP] Device is disabled - show LockWindow immediately')
    handleLockDevice()
  }

  runClient()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
