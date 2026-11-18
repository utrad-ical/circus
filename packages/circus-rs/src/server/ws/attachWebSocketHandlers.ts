import type { Server } from 'node:http';
import type * as ws from 'ws';
import type WebSocketConnectionHandler from './connection/WebSocketConnectionHandler.ts';

export const attachWebSocketHandlers = (
  server: Server,
  wss: ws.WebSocketServer,
  routes: Record<string, WebSocketConnectionHandler>
) => {
  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url?.split('?', 1)[0];
    const handler =
      pathname && Object.hasOwn(routes, pathname)
        ? routes[pathname]
        : undefined;

    if (request.headers.upgrade?.toLowerCase() === 'websocket' && handler) {
      wss.handleUpgrade(request, socket, head, connection => {
        wss.emit('connection', connection, request);
        handler(connection, request);
      });
    } else {
      console.log(`Reject upgrade to ${pathname}`);
      socket.destroy();
    }
  });
};
