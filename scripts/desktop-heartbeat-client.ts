/**
 * Desktop Client Heartbeat Simulator
 * Sends HEARTBEAT every 10 seconds. Handles LOCK_DEVICE / UNLOCK_DEVICE.
 *
 * Run: npx tsx scripts/desktop-heartbeat-client.ts
 * Or integrate this logic into your actual desktop app (Electron, etc.)
 *
 * Env: WS_URL (default ws://localhost:4001)
 *      API_URL (default http://localhost:3000)
 *      DEVICE_ID (default ORION-DEVICE-001)
 */

import WebSocket from 'ws'
import { prisma } from '../lib/prisma'

const WS_URL = process.env.WS_URL ?? 'ws://localhost:4001'
const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
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
  // In real desktop app: stop tracking, stop sync, stop screenshot,
  // show full-screen LockWindow, disable close/minimize, disable Alt+Tab
}

function handleUnlockDevice(): void {
  console.log('[LOCK] UNLOCK_DEVICE received - closing LockWindow, resuming services')
  // In real desktop app: close LockWindow, restart tracking, resume sync
}

/**
 * Handle CAPTURE_SCREEN command.
 * In a real Electron app: use desktopCapturer or screenshot-desktop to capture.
 * This simulator sends a minimal placeholder PNG for testing the flow.
 */
function handleCaptureScreen(ws: WebSocket, deviceIdentifier: string): void {
  console.log('[CAPTURE] CAPTURE_SCREEN received')
  // Placeholder: 1x1 transparent PNG (real app would use screenshot-desktop or Electron desktopCapturer)
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
    console.log('[CAPTURE] Sent placeholder SCREENSHOT_RESULT (integrate real capture in Electron app)')
  }
}

function runClient() {
  const ws = new WebSocket(WS_URL)

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let deviceIdentifier: string = DEVICE_ID

  ws.on('open', () => {
    console.log('Connected to WebSocket server')
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
      const msg = JSON.parse(data.toString()) as { type?: string }
      if (msg.type === 'REGISTERED') {
        deviceIdentifier = DEVICE_ID
        console.log('Registered as device:', deviceIdentifier)
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'HEARTBEAT', deviceId: deviceIdentifier }))
            console.log('HEARTBEAT SENT')
          }
        }, 10_000)
      } else if (msg.type === 'LOCK_DEVICE' || msg.type === 'LOCK') {
        handleLockDevice()
      } else if (msg.type === 'UNLOCK_DEVICE' || msg.type === 'UNLOCK') {
        handleUnlockDevice()
      } else if (msg.type === 'CAPTURE_SCREEN') {
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
