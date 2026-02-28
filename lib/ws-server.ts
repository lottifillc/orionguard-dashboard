import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { prisma } from './prisma';
import { deviceConnections } from './ws-connection-store';
import * as fs from 'fs';
import * as path from 'path';

const WS_PORT = Number(process.env.WS_PORT ?? 4001);

let wss: WebSocketServer | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

const LIVE_SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'live-screenshots');

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

function ensureLiveScreenshotsDir(): void {
  if (!fs.existsSync(LIVE_SCREENSHOTS_DIR)) {
    fs.mkdirSync(LIVE_SCREENSHOTS_DIR, { recursive: true });
  }
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
  console.log('REGISTER device:', device.deviceIdentifier, '(Prisma id:', device.id, ')');
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

  console.log('SCREENSHOT_RESULT RECEIVED:', deviceId);

  if (!deviceId || !imageBase64 || typeof imageBase64 !== 'string') {
    console.log('[WS] SCREENSHOT_RESULT SKIP: missing deviceId or imageBase64');
    return;
  }

  const device = await prisma.device.findFirst({
    where: {
      OR: [{ deviceIdentifier: deviceId }, { id: deviceId }],
    },
    select: { id: true, companyId: true, deviceIdentifier: true },
  });

  console.log('Device found:', device?.id ?? 'undefined');
  if (!device) {
    console.warn('[WS] ⚠️ SCREENSHOT_RESULT: Device NOT FOUND for deviceId:', deviceId);
    return;
  }

  ensureLiveScreenshotsDir();
  const timestamp = Date.now();
  const fileName = `${device.deviceIdentifier.replace(/[^a-zA-Z0-9-_]/g, '_')}-${timestamp}.png`;
  const absolutePath = path.join(LIVE_SCREENSHOTS_DIR, fileName);

  console.log('Saving screenshot to:', absolutePath);

  try {
    const buffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(absolutePath, buffer);
    console.log('[WS] Screenshot file saved:', fileName);
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
    console.log('[WS] Created system session for screenshot:', session.id);
  }

  const dbFilePath = fileName;
  const saved = await prisma.screenshot.create({
    data: {
      sessionId: session.id,
      deviceId: device.id,
      filePath: dbFilePath,
    },
  });

  console.log('SCREENSHOT_RESULT FileName:', fileName, 'deviceId:', device.id, 'saved:', saved.id);
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
  console.log('WS MESSAGE:', data.toString());
  let parsed: { type?: string };
  try {
    parsed = JSON.parse(data.toString()) as { type?: string };
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
    console.log('HEARTBEAT RECEIVED FROM:', deviceId);
    return;
  }

  if (!deviceIdentifier) {
    ws.send(JSON.stringify({ type: 'ERROR', error: 'Register first' }));
    return;
  }

  if (type === 'SCREENSHOT_RESULT') {
    console.log('[WS] SCREENSHOT_RESULT case entered, deviceIdentifier:', deviceIdentifier);
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
        console.log('DEVICE OFFLINE:', d.deviceIdentifier);
      }
    } catch (err) {
      console.error('[WS] Offline detector error:', err);
    }
  }, OFFLINE_CHECK_INTERVAL_MS);
}

function startServer(): void {
  ensureLiveScreenshotsDir();
  httpServer = createServer();
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    ws.on('message', (data: Buffer) => {
      const devId = (ws as WebSocket & { _deviceIdentifier?: string })._deviceIdentifier;
      handleMessage(ws, data, devId ?? null);
    });

    ws.on('close', () => {
      const devId = (ws as WebSocket & { _deviceIdentifier?: string })._deviceIdentifier;
      if (devId) {
        deviceConnections.delete(devId);
        console.log('CONNECTED DEVICES:', Array.from(deviceConnections.keys()));
        console.log('Device disconnected:', devId);
        markDeviceOffline(devId).catch((err) => {
          console.error('[WS] Failed to mark device offline:', err);
        });
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Connection error:', err);
      console.log('CONNECTED DEVICES:', Array.from(deviceConnections.keys()));
    });
  });

  httpServer.listen(WS_PORT, () => {
    console.log(`[WS] WebSocket server listening on ws://localhost:${WS_PORT}`);
    console.log('WS SERVER RUNNING ON PORT 4001');
    startOfflineDetector();
  });
}

const IS_SERVERLESS =
  typeof process.env.VERCEL !== 'undefined' ||
  typeof process.env.AWS_LAMBDA_FUNCTION_NAME !== 'undefined' ||
  process.env.NEXT_RUNTIME === 'edge';

export function startWebSocketServer(): void {
  if (IS_SERVERLESS) {
    console.warn(
      '[WS] ⚠️ WebSocket is not supported in serverless mode. Set VERCEL=0 or deploy to a Node.js server (Railway, VPS, etc.) for WebSocket support.'
    );
    return;
  }
  if (!(globalThis as unknown as { _wsServerStarted?: boolean })._wsServerStarted) {
    (globalThis as unknown as { _wsServerStarted?: boolean })._wsServerStarted = true;
    startServer();
  } else {
    console.log('[WS] Server already running on port', WS_PORT);
  }
}

export function stopWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!wss || !httpServer) {
      resolve();
      return;
    }
    deviceConnections.clear();
    wss.close(() => {
      httpServer?.close(() => {
        wss = null;
        httpServer = null;
        resolve();
      });
    });
  });
}
