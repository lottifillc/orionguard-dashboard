import { deviceConnections } from './ws-connection-store';
import { prisma } from './prisma';

/**
 * Resolve deviceIdentifier from deviceId (which may be Device.id or deviceIdentifier).
 */
async function resolveDeviceIdentifier(deviceId: string): Promise<string | null> {
  const device = await prisma.device.findFirst({
    where: {
      OR: [{ id: deviceId }, { deviceIdentifier: deviceId }],
    },
    select: { deviceIdentifier: true },
  });
  return device?.deviceIdentifier ?? null;
}

/**
 * Send LOCK_DEVICE command to the specified device.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @returns true if command was sent, false if device is offline
 */
export async function sendLockCommand(deviceId: string): Promise<boolean> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);
  if (!deviceIdentifier) return false;

  const ws = deviceConnections.get(deviceIdentifier);
  if (!ws || ws.readyState !== 1 /* OPEN */) return false;

  ws.send(JSON.stringify({ type: 'LOCK_DEVICE' }));
  return true;
}

/**
 * Send UNLOCK_DEVICE command to the specified device.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @returns true if command was sent, false if device is offline
 */
export async function sendUnlockCommand(deviceId: string): Promise<boolean> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);
  if (!deviceIdentifier) return false;

  const ws = deviceConnections.get(deviceIdentifier);
  if (!ws || ws.readyState !== 1 /* OPEN */) return false;

  ws.send(JSON.stringify({ type: 'UNLOCK_DEVICE' }));
  return true;
}

/** @deprecated Use sendLockCommand */
export const sendDisableCommand = sendLockCommand;

/** @deprecated Use sendUnlockCommand */
export const sendEnableCommand = sendUnlockCommand;

/**
 * Send CAPTURE_SCREEN command to the specified device.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @returns true if command was sent, false if device is offline
 */
export async function sendScreenshotCommand(deviceId: string): Promise<boolean> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);

  const socket = deviceConnections.get(deviceIdentifier ?? '');

  if (!deviceIdentifier) return false;

  if (!socket || socket.readyState !== 1 /* OPEN */) {
    console.log('[device-commands] sendScreenshotCommand: device not connected, deviceIdentifier:', deviceIdentifier);
    throw new Error('Device not connected');
  }

  console.log('[device-commands] sending CAPTURE_SCREEN to:', deviceIdentifier);
  socket.send(JSON.stringify({ type: 'CAPTURE_SCREEN' }));
  return true;
}
