import WebSocketConnectionHandler from "./WebSocketConnectionHandler";

const bufferedAmountCheck: WebSocketConnectionHandler = async (ws) => {

    const sendMessage = async (data: string | ArrayBuffer) => {
        try {
            await new Promise<void>((resolve, reject) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(data, (err) => void (err ? reject(err) : resolve()));
                } else {
                    reject('Unable to send message: connection lost.');
                }
            });
        } catch (e) {
            console.error(e);
        }
    };

    let lastBufferAmount = NaN;
    const dumpBufferAmount = () => {
        // const bufferedAmount = ws.bufferedAmount;
        // const bufferedAmount = (ws as any)._sender._bufferedBytes;
        // const bufferedAmount: number = (ws as any)._socket._writableState.length;
        // const bufferedAmount: number = (ws as any)._socket.writableLength;
        const bufferedAmount: number = (ws as any)._socket.bufferSize;
        if (lastBufferAmount !== bufferedAmount) {
            console.log(`bufferedAmount: ${bufferedAmount}`);
            lastBufferAmount = bufferedAmount;
        }
        return bufferedAmount;
    };

    const bufferFlushed = (bufferSize: number = 0) => new Promise<void>((resolve) => {
        const check = () => void (dumpBufferAmount() <= bufferSize ? resolve() : setImmediate(check));
        check();
    });

    const messageHandler = createMessageHandler({ sendMessage, dumpBufferAmount, bufferFlushed });

    ws.addEventListener('message', ({ data }) => {
        if (typeof data !== 'string') return;

        const [count, chunkSize, type] = data.split(':');

        messageHandler({
            waitForBufferToEmpty: type === 'wait',
            count: Number(count),
            chunkSize: Number(chunkSize)
        });
    });

    ws.addEventListener('close', () => {
        console.log(`Closed`);
    });
};

interface WsFunctions {
    sendMessage: (data: string | ArrayBuffer) => Promise<void>;
    dumpBufferAmount: () => number;
    bufferFlushed: () => Promise<void>;
}

type Options = {
    waitForBufferToEmpty: boolean;
    count: number;
    chunkSize: number;
};

const createMessageHandler: (fn: WsFunctions) => (opts: Options) => void
    = ({ sendMessage, dumpBufferAmount, bufferFlushed }) =>
        async ({ waitForBufferToEmpty, count, chunkSize }) => {
            await sendMessage('Connect to websocket /ws/bufferedAmountCheck');

            const title = `${chunkSize} [bytes] x ${count} [times] ${waitForBufferToEmpty ? '(wait)' : ''}`;
            const startTime = new Date().getTime();

            const processes: Promise<void>[] = [];
            for (let i = 1; i <= count; i++) {
                const message = `${i}. Send ${chunkSize.toLocaleString()} [bytes] buffer`;
                console.log(message);
                // processes.push(sendMessage(message));
                processes.push(sendMessage(new ArrayBuffer(chunkSize)));
                if (waitForBufferToEmpty) {
                    await bufferFlushed();
                } else {
                    dumpBufferAmount();
                }
            }

            await Promise.all([...processes, bufferFlushed()]);

            await sendMessage(`${title} in ${(new Date().getTime() - startTime).toLocaleString()} [ms]`);
        };


export default bufferedAmountCheck;

