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
 * Send DISABLE_DEVICE command to the specified device.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @returns true if command was sent, false if device is offline
 */
export async function sendDisableCommand(deviceId: string): Promise<boolean> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);
  if (!deviceIdentifier) return false;

  const ws = deviceConnections.get(deviceIdentifier);
  if (!ws || ws.readyState !== 1 /* OPEN */) return false;

  ws.send(JSON.stringify({ type: 'DISABLE_DEVICE' }));
  return true;
}

/**
 * Send ENABLE_DEVICE command to the specified device.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @returns true if command was sent, false if device is offline
 */
export async function sendEnableCommand(deviceId: string): Promise<boolean> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);
  if (!deviceIdentifier) return false;

  const ws = deviceConnections.get(deviceIdentifier);
  if (!ws || ws.readyState !== 1 /* OPEN */) return false;

  ws.send(JSON.stringify({ type: 'ENABLE_DEVICE' }));
  return true;
}

/**
 * Send CAPTURE_SCREEN command to the specified device.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @returns true if command was sent, false if device is offline
 */
export async function sendScreenshotCommand(deviceId: string): Promise<boolean> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);

  console.log('Looking for device:', deviceId);
  console.log('Available devices:', [...deviceConnections.keys()]);

  const socket = deviceConnections.get(deviceIdentifier ?? '');

  if (!deviceIdentifier) return false;

  if (!socket || socket.readyState !== 1 /* OPEN */) {
    throw new Error('Device not connected');
  }

  socket.send(JSON.stringify({ type: 'CAPTURE_SCREEN' }));
  return true;
}
