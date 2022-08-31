
import Koa from 'koa';

import * as ws from 'ws';
import WebSocketConnectionHandler from './connection/WebSocketConnectionHandler';

const withWebSocketConnectionHandlers =
  (wss: ws.Server, routes: Record<string, WebSocketConnectionHandler>) =>
    (app: Koa<Koa.DefaultState, Koa.DefaultContext>) => {

      const listen = app.listen;
      app.listen = ((...args: Parameters<typeof listen>) => {
        const server = listen.apply(app, args);

        wss.on('connection', function connection(ws: ws.WebSocket, request) {
          if (!request.url || !(request.url in routes)) return;
          const handler = routes[request.url];
          handler(ws, request);
        });

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
