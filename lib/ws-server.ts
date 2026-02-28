import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from './prisma';
import { deviceConnections, dashboardConnections } from './ws-connection-store';
import { sendRequestLiveFrame } from './device-commands';
import * as fs from 'fs';
import * as path from 'path';
import {
  LIVE_SCREENSHOTS_DIR,
  ensureLiveScreenshotsDir,
  toDbFilePath,
} from './screenshot-paths';

interface RegisterMessage {
  type: 'REGISTER';
  deviceId: string;
  companyId: string;
}

interface ScreenshotResultMessage {
  type: 'SCREENSHOT_RESULT';
  deviceId: string;
  imageBase64: string;
}

async function handleRegister(
  ws: WebSocket,
  msg: RegisterMessage
): Promise<{ deviceIdentifier: string; deviceId: string } | null> {
  const { deviceId, companyId } = msg;
  if (!deviceId || typeof deviceId !== 'string' || !companyId || typeof companyId !== 'string') {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'deviceId and companyId required' }));
    return null;
  }

  const device = await prisma.device.findFirst({
    where: {
      OR: [{ deviceIdentifier: deviceId }, { id: deviceId }],
      companyId,
    },
    select: { id: true, deviceIdentifier: true },
  });

  if (!device) {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'Device not found or does not belong to company' }));
    return null;
  }

  deviceConnections.set(device.deviceIdentifier, ws);
  const now = new Date();
  await prisma.device.update({
    where: { id: device.id },
    data: { isOnline: true, lastSeenAt: now, lastHeartbeatAt: now },
  });

  ws.send(JSON.stringify({ type: 'REGISTERED', deviceId: device.id }));
  return { deviceIdentifier: device.deviceIdentifier, deviceId: device.id };
}

async function handleScreenshotResult(msg: ScreenshotResultMessage): Promise<void> {
  const { deviceId, imageBase64 } = msg;

  if (!deviceId || !imageBase64 || typeof imageBase64 !== 'string') {
    return;
  }

  const device = await prisma.device.findFirst({
    where: {
      OR: [{ deviceIdentifier: deviceId }, { id: deviceId }],
    },
    select: { id: true, companyId: true, deviceIdentifier: true },
  });

  if (!device) {
    return;
  }

  ensureLiveScreenshotsDir();
  const timestamp = Date.now();
  const fileName = `${device.deviceIdentifier.replace(/[^a-zA-Z0-9-_]/g, '_')}-${timestamp}.png`;
  const absolutePath = path.join(LIVE_SCREENSHOTS_DIR, fileName);

  try {
    const buffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(absolutePath, buffer);
  } catch (err) {
    console.error('[WS] Failed to save screenshot:', err);
    return;
  }

  let session = await prisma.session.findFirst({
    where: { deviceId: device.id, status: 'ACTIVE' },
    orderBy: { loginTime: 'desc' },
    select: { id: true },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        companyId: device.companyId,
        deviceId: device.id,
        isSystemSession: true,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
  }

  const dbFilePath = toDbFilePath(fileName);
  const capturedAt = new Date(Date.now());
  await prisma.screenshot.create({
    data: {
      sessionId: session.id,
      deviceId: device.id,
      filePath: dbFilePath,
      capturedAt,
    },
  });
}

async function handleHeartbeat(deviceId: string): Promise<void> {
  const device = await prisma.device.findFirst({
    where: {
      OR: [{ deviceIdentifier: deviceId }, { id: deviceId }],
    },
    select: { id: true },
  });
  if (!device) return;
  const now = new Date();
  await prisma.device.update({
    where: { id: device.id },
    data: { lastHeartbeatAt: now, isOnline: true },
  });
}

function handleMessage(ws: WebSocket, data: Buffer, deviceIdentifier: string | null): void {
  let parsed: { type?: string; deviceId?: string };
  try {
    parsed = JSON.parse(data.toString()) as { type?: string; deviceId?: string };
  } catch {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'Invalid JSON' }));
    return;
  }

  const { type } = parsed;

  if (type === 'REGISTER') {
    handleRegister(ws, parsed as unknown as RegisterMessage).then((result) => {
      if (result) {
        (ws as WebSocket & { _deviceIdentifier?: string })._deviceIdentifier = result.deviceIdentifier;
      }
    });
    return;
  }

  if (type === 'REQUEST_LIVE_FRAME') {
    const msg = parsed as { type: string; deviceId?: string };
    const deviceId = msg?.deviceId;
    if (!deviceId || typeof deviceId !== 'string') {
      ws.send(JSON.stringify({ type: 'ERROR', error: 'deviceId required for REQUEST_LIVE_FRAME' }));
      return;
    }
    dashboardConnections.add(ws);
    sendRequestLiveFrame(deviceId).catch(() => {
      ws.send(JSON.stringify({ type: 'ERROR', error: 'Device not connected' }));
    });
    return;
  }

  if (type === 'HEARTBEAT') {
    const heartbeatMsg = parsed as { type: string; deviceId?: string };
    const deviceId = heartbeatMsg?.deviceId;
    if (!deviceId || typeof deviceId !== 'string') {
      ws.send(JSON.stringify({ type: 'ERROR', error: 'deviceId required for HEARTBEAT' }));
      return;
    }
    handleHeartbeat(deviceId).catch((err) => {
      console.error('[WS] Heartbeat error:', err);
    });
    return;
  }

  if (!deviceIdentifier) {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'Register first' }));
    return;
  }

  if (type === 'LIVE_FRAME_READY') {
    const msg = parsed as { type: string; deviceId?: string; timestamp?: number };
    const payload = JSON.stringify({
      type: 'LIVE_FRAME_READY',
      deviceId: msg.deviceId ?? deviceIdentifier,
      timestamp: msg.timestamp ?? Date.now(),
    });
    for (const dws of dashboardConnections) {
      if (dws.readyState === 1) dws.send(payload);
    }
    return;
  }

  if (type === 'LIVE_FRAME') {
    const msg = parsed as { type: string; deviceId?: string; companyId?: string; image?: string; timestamp?: string };
    if (!msg.image || typeof msg.image !== 'string') return;
    const devIdentifier = msg.deviceId ?? deviceIdentifier ?? '';
    prisma.device
      .findFirst({
        where: { OR: [{ id: devIdentifier }, { deviceIdentifier: devIdentifier }] },
        select: { id: true, deviceIdentifier: true },
      })
      .then((device) => {
        const payload = JSON.stringify({
          type: 'LIVE_FRAME',
          deviceId: device?.id ?? devIdentifier,
          deviceIdentifier: device?.deviceIdentifier ?? devIdentifier,
          companyId: msg.companyId,
          image: msg.image,
          timestamp: msg.timestamp ?? new Date().toISOString(),
        });
        for (const dws of dashboardConnections) {
          if (dws.readyState === 1) dws.send(payload);
        }
      })
      .catch(() => {
        const payload = JSON.stringify({
          type: 'LIVE_FRAME',
          deviceId: devIdentifier,
          deviceIdentifier: devIdentifier,
          companyId: msg.companyId,
          image: msg.image,
          timestamp: msg.timestamp ?? new Date().toISOString(),
        });
        for (const dws of dashboardConnections) {
          if (dws.readyState === 1) dws.send(payload);
        }
      });
    return;
  }

  if (type === 'SCREENSHOT_RESULT') {
    handleScreenshotResult(parsed as unknown as ScreenshotResultMessage).catch((err) => {
      console.error('[WS] ScreenshotResult error:', err);
    });
    return;
  }
}

async function markDeviceOffline(deviceIdentifier: string): Promise<void> {
  const device = await prisma.device.findUnique({
    where: { deviceIdentifier },
    select: { id: true },
  });
  if (device) {
    await prisma.device.update({
      where: { id: device.id },
      data: { isOnline: false },
    });
  }
}

const OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 seconds
const OFFLINE_CHECK_INTERVAL_MS = 15 * 1000; // 15 seconds

function startOfflineDetector(): void {
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);
      const staleDevices = await prisma.device.findMany({
        where: {
          isOnline: true,
          OR: [
            { lastHeartbeatAt: { lt: cutoff } },
            { lastHeartbeatAt: null },
          ],
        },
        select: { id: true, deviceIdentifier: true },
      });
      for (const d of staleDevices) {
        await prisma.device.update({
          where: { id: d.id },
          data: { isOnline: false },
        });
      }
    } catch (err) {
      console.error('[WS] Offline detector error:', err);
    }
  }, OFFLINE_CHECK_INTERVAL_MS);
}

let offlineDetectorStarted = false;

function startOfflineDetectorOnce(): void {
  if (offlineDetectorStarted) return;
  offlineDetectorStarted = true;
  startOfflineDetector();
}

/**
 * Attach WebSocket connection handlers to an existing WebSocketServer.
 * Used by custom server.js when WS is mounted on the same HTTP server as Next.js.
 */
export function attachWebSocketHandlers(wss: WebSocketServer): void {
  ensureLiveScreenshotsDir();
  startOfflineDetectorOnce();

  wss.on('connection', (ws: WebSocket) => {
    console.log('PRODUCTION WS CONNECTED');

    ws.on('message', (data: Buffer) => {
      const devId = (ws as WebSocket & { _deviceIdentifier?: string })._deviceIdentifier;
      handleMessage(ws, data, devId ?? null);
    });

    ws.on('close', () => {
      dashboardConnections.delete(ws);
      const devId = (ws as WebSocket & { _deviceIdentifier?: string })._deviceIdentifier;
      if (devId) {
        deviceConnections.delete(devId);
        markDeviceOffline(devId).catch((err) => {
          console.error('[WS] Failed to mark device offline:', err);
        });
      }
    });

    ws.on('error', () => {
      // connection error
    });
  });
}
