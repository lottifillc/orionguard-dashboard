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
    throw new Error('Device not connected');
  }

  socket.send(JSON.stringify({ type: 'TAKE_SCREENSHOT' }));
  return true;
}

/**
 * Send REQUEST_LIVE_FRAME command to the specified device.
 * Device must capture a NEW screenshot and send LIVE_FRAME_READY when done.
 * @param deviceId - Device database id (cuid)
 * @returns true if command was sent, false if device is offline
 */
export async function sendRequestLiveFrame(deviceId: string): Promise<boolean> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);
  if (!deviceIdentifier) return false;

  const socket = deviceConnections.get(deviceIdentifier);
  if (!socket || socket.readyState !== 1 /* OPEN */) return false;

  socket.send(JSON.stringify({ type: 'REQUEST_LIVE_FRAME', deviceId }));
  return true;
}

/**
 * Generic command sender: find WebSocket for deviceId and send JSON message.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @param command - { type: string, payload?: object }
 * @throws Error with "Device offline" if device is not connected
 */
export async function sendCommandToDevice(
  deviceId: string,
  command: { type: string; payload?: Record<string, unknown> }
): Promise<void> {
  const deviceIdentifier = await resolveDeviceIdentifier(deviceId);
  if (!deviceIdentifier) {
    throw new Error('Device not found');
  }

  const ws = deviceConnections.get(deviceIdentifier);
  if (!ws || ws.readyState !== 1 /* OPEN */) {
    throw new Error('Device offline');
  }

  const message =
    command.payload != null
      ? { type: command.type, payload: command.payload }
      : { type: command.type };
  ws.send(JSON.stringify(message));
}

/**
 * Send BLOCK_INPUT command to block mouse and keyboard on the device.
 */
export async function sendBlockInputCommand(deviceId: string): Promise<void> {
  await sendCommandToDevice(deviceId, { type: 'BLOCK_INPUT' });
}

/**
 * Send UNBLOCK_INPUT command to unblock mouse and keyboard on the device.
 */
export async function sendUnblockInputCommand(deviceId: string): Promise<void> {
  await sendCommandToDevice(deviceId, { type: 'UNBLOCK_INPUT' });
}

/**
 * Send SET_EMERGENCY_PIN command with the hashed PIN to the device.
 * @param deviceId - Device id (cuid) or deviceIdentifier
 * @param pinHash - SHA256 hash of PIN, hex string lowercase
 */
export async function sendSetEmergencyPinCommand(
  deviceId: string,
  pinHash: string
): Promise<void> {
  await sendCommandToDevice(deviceId, {
    type: 'SET_EMERGENCY_PIN',
    payload: { pinHash },
  });
}
