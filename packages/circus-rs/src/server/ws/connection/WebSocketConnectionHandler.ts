import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

/**
 * Handler called when a WebSocket connection is established
 */
type WebSocketConnectionHandler = (
  ws: WebSocket,
  request: IncomingMessage
) => void;
export type { WebSocketConnectionHandler as default };
