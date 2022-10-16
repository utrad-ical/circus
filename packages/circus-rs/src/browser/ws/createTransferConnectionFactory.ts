import { PartialVolumeDescriptor } from "@utrad-ical/circus-lib";
import {
    beginTransferMessageData,
    createMessageBuffer,
    setPriorityMessageData,
    stopTransferMessageData,
    parseMessageBuffer,
    isImageTransferData,
    pauseTransferMessageData,
    resumeTransferMessageData
} from "../../common/ws/message";
import WebSocketClient from "./WebSocketClient";

interface VolumeSpecifier {
    seriesUid: string;
    partialVolumeDescriptor?: PartialVolumeDescriptor;
};

export type TransferConnectionFactory =
    (volumeSpecifier: VolumeSpecifier, handler: TransferredImageHandler) => TransferConnection;


type TransferredImageHandler = (imageIndex: number, buffer: ArrayBuffer) => void;

export interface TransferConnection {
    readonly id: string;
    setPriority(imageIndices: number[], priority: number): void;
    pause(): void;
    resume(): void;
    abort(): void;
}

export const createTransferConnectionFactory = (wsClient: WebSocketClient): TransferConnectionFactory => {
    const handlerCollection = new Map<string, TransferredImageHandler>();

    wsClient.addMessageEventListener(e => {

        const { data: message } = e;
        if (typeof message === 'string') return;

        const { data, buffer } = parseMessageBuffer(message);

        if (isImageTransferData(data)) {

            if (data.messageType === 'TRANSFER_IMAGE') {
                const { transferId, imageIndex } = data;
                if (handlerCollection.has(transferId)) {
                    const handler = handlerCollection.get(transferId)!;
                    handler(imageIndex, buffer!);
                } else {
                    // To prevent many stop messages from being sent, 
                    // stop messages are not sent even in the case of unmanaged reception.
                    // Otherwise, the client will respond the same number of times as the number
                    // of messages the server has already emitted.
                    // 
                    // const data = stopTransferMessageData(transferId);
                    // const message = createMessageBuffer(data);
                    // wsClient.send(message);
                }
            }
        }
    });

    let lastTransferId = 0;
    return (volumeSpecifier, handler): TransferConnection => {
        const { seriesUid, partialVolumeDescriptor } = volumeSpecifier;
        const id = (++lastTransferId).toString();

        const data = beginTransferMessageData(id, seriesUid, partialVolumeDescriptor);
        const message = createMessageBuffer(data);
        wsClient.send(message);
        handlerCollection.set(id, handler);

        const setPriority = (imageIndices: number[], priority: number) => {
            const data = setPriorityMessageData(id, imageIndices, priority);
            const message = createMessageBuffer(data);
            wsClient.send(message);
        }

        const abort = () => {
            if (wsClient.connected()) {
                const data = stopTransferMessageData(id);
                const message = createMessageBuffer(data);
                wsClient.send(message);
            }
            handlerCollection.delete(id);
        }

        const pause = () => {
            const data = pauseTransferMessageData(id);
            const message = createMessageBuffer(data);
            wsClient.send(message);
        }

        const resume = () => {
            const data = resumeTransferMessageData(id);
            const message = createMessageBuffer(data);
            wsClient.send(message);
        }

        return { id, setPriority, abort, pause, resume };
    };
};
