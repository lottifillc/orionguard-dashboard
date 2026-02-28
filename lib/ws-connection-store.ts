import { WebSocket } from 'ws';

type WSMap = Map<string, WebSocket>;

declare global {
  var _deviceConnections: WSMap | undefined;
}

export const deviceConnections: WSMap =
  global._deviceConnections ?? new Map<string, WebSocket>();

if (!global._deviceConnections) {
  global._deviceConnections = deviceConnections;
}
