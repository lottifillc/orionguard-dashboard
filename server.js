/**
 * Custom Next.js server with WebSocket mounted on the same HTTP server.
 * Production: wss://orionguard.lottifi.com/ws
 * Local dev: ws://localhost:3000/ws
 */

const next = require('next');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

async function start() {
  const { ensureLiveScreenshotsDir, LIVE_SCREENSHOTS_DIR } = require('./lib/screenshot-paths');
  ensureLiveScreenshotsDir();

  await app.prepare();

  const server = http.createServer(async (req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (pathname.startsWith('/live-screenshots/')) {
      const relativePath = pathname.replace('/live-screenshots/', '');
      const filePath = path.join(LIVE_SCREENSHOTS_DIR, relativePath);
      const resolved = path.resolve(filePath);
      const baseResolved = path.resolve(LIVE_SCREENSHOTS_DIR);
      if (!resolved.startsWith(baseResolved) || relativePath.includes('..')) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (fs.existsSync(filePath)) {
        res.writeHead(200, {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    const parsedUrl = parse(req.url || '/', true);
    await handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const pathname = req.url?.split('?')[0];
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const { attachWebSocketHandlers } = require('./lib/ws-server');
  attachWebSocketHandlers(wss);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> WebSocket: ws://localhost:${port}/ws`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
