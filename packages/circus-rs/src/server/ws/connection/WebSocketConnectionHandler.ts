
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

type WebSocketConnectionHandler = (ws: WebSocket, request: IncomingMessage) => void;
export default WebSocketConnectionHandler;
