
import Koa from 'koa';

import { Server as WebSocketServer, WebSocket } from 'ws';
import WebSocketConnectionHandler from './connection/WebSocketConnectionHandler';

const withWebSocketConnectionHandlers = (routes: Record<string, WebSocketConnectionHandler>) => (app: Koa<Koa.DefaultState, Koa.DefaultContext>) => {

  const createWebSocketServer = () => {
    const wss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: {
        zlibDeflateOptions: {
          // See zlib defaults.
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
      }
    });

    wss.on('connection', function connection(ws: WebSocket, request) {
      if (!request.url || !(request.url in routes)) return;
      const handler = routes[request.url];
      handler(ws, request);
    });

    return wss;
  };

  const listen = app.listen;
  app.listen = ((...args: Parameters<typeof listen>) => {
    const server = listen.apply(app, args);
    const wss = createWebSocketServer();
    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url;
      const { upgrade } = request.headers;
      if (upgrade === 'websocket' && pathname in routes) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        console.log(`Reject upgrade to ${pathname}`);
        socket.destroy();
      }
    });

    return server;
  }) as typeof listen;
};

export default withWebSocketConnectionHandlers;
