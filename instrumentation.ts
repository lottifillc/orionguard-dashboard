export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapIfEmpty } = await import('./lib/bootstrap');
    await bootstrapIfEmpty();

    const { startWebSocketServer } = await import('./lib/ws-server');
    startWebSocketServer();
  }
}
