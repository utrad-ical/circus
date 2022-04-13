type ConstructorArgumentsType<T> = T extends { new(...arg1: infer U): any; } ? U : never;
type WebSocketConstructorArguments = ConstructorArgumentsType<typeof WebSocket>;
type MessageEventListener = (e: MessageEvent) => void;

interface IWebSocketClient {
    addMessageEventListener(listener: MessageEventListener): void;
    removeMessageEventListener(listener: MessageEventListener): void;
    connected(): boolean;
    dispose(): void | Promise<void>;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): Promise<void>
}

export default class WebSocketClient implements IWebSocketClient {
    private wsArguments: WebSocketConstructorArguments;
    private ws: WebSocket | null = null;
    private connecting: Promise<WebSocket> | null = null;
    private listeners: MessageEventListener[] = [];

    constructor(...wsArguments: WebSocketConstructorArguments) {
        this.wsArguments = wsArguments;
        this.handleMessage = this.handleMessage.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    public addMessageEventListener(listener: MessageEventListener) {
        this.listeners.push(listener);
    }

    public removeMessageEventListener(listener: MessageEventListener) {
        this.listeners = this.listeners.filter(i => i !== listener);
    }

    private handleMessage(e: MessageEvent) {
        this.listeners.forEach(listener => listener(e));
    }

    private handleError(e: Event) {
        const ws = e.target as WebSocket;
        console.error(e);
        console.error(this);
        switch (ws.readyState) {
            case WebSocket.CLOSED:
                throw new Error('CLOSED');
            case WebSocket.CLOSING:
                throw new Error('CLOSING');
            case WebSocket.CONNECTING:
                throw new Error('CONNECTING');
            case WebSocket.OPEN:
                throw new Error('OPEN');
        }
    };

    private createSocket(): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            console.log('Try to connect ...');

            const ws = new WebSocket(...this.wsArguments);
            ws.binaryType = 'arraybuffer';

            let rejected = false;

            const suspended = (e: CloseEvent) => {
                console.log('Socket suspended');
                if (!rejected) {
                    rejected = true;
                    reject('Socket suspended');
                }
            };

            const failed = (e: Event) => {
                console.log('Socket failed');
                if (!rejected) {
                    rejected = true;
                    reject('Socket failed');
                }
            };

            const opened = (e: Event) => {
                console.log('Socket connected');
                ws.removeEventListener('close', suspended);
                ws.removeEventListener('error', failed);
                resolve(ws);
            };

            ws.addEventListener('open', opened);
            ws.addEventListener('close', suspended);
            ws.addEventListener('error', failed);
        });
    }

    private connect(): Promise<WebSocket> {
        if (this.connecting) return this.connecting;

        return this.connecting = (async () => {
            const ws = await this.createSocket();
            ws.addEventListener('message', this.handleMessage);
            ws.addEventListener('error', this.handleError);
            this.connecting = null;
            this.ws = ws;
            return ws;
        })();
    }

    public connected() {
        return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
    }

    private disconnect() {
        const ws = this.ws;
        this.ws = null;

        switch (ws?.readyState) {
            case WebSocket.CLOSED:
            case WebSocket.CLOSING:
                break;
            case WebSocket.CONNECTING:
            case WebSocket.OPEN:
                ws.close();
                console.log('disconnected');
                break;
        }
    }

    public dispose() {
        this.disconnect();
    }

    public async send(data: string | ArrayBufferLike | Blob | ArrayBufferView): Promise<void> {
        console.log('Try to send ...');
        const ws = this.connected() ? this.ws! : (await this.connect());
        ws.send(data);
    }
}
