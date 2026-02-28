import { WebSocket } from 'ws';

type WSMap = Map<string, WebSocket>;

declare global {
  var _deviceConnections: WSMap | undefined;
  var _dashboardConnections: Set<WebSocket> | undefined;
}

export const deviceConnections: WSMap =
  global._deviceConnections ?? new Map<string, WebSocket>();

export const dashboardConnections: Set<WebSocket> =
  global._dashboardConnections ?? new Set<WebSocket>();

if (!global._deviceConnections) {
  global._deviceConnections = deviceConnections;
}
if (!global._dashboardConnections) {
  global._dashboardConnections = dashboardConnections;
}
