import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

/**
 * Handler called when a WebSocket connection is established
 */
type WebSocketConnectionHandler = (
  ws: WebSocket,
  request: IncomingMessage
) => void;
export default WebSocketConnectionHandler;
