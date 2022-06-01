import { console_log } from "debug";
import {
    beginTransferMessageData,
    createMessageBuffer,
    setPriorityMessageData,
    stopTransferMessageData,
    parseMessageBuffer,
    isImageTransferData,
    MessageDataType
} from "../../common/ws/message";
import { MultiRangeDescriptor, VolumeSpecifier } from "../../common/ws/types";
import WebSocketClient from "./WebSocketClient";

export interface TransferClientFactory {
    make(volumeSpecifier: VolumeSpecifier, handler: TransferredImageHandler): TransferClient;
}

type TransferredImageHandler = (imageNo: number, buffer: ArrayBuffer) => void;

export type TransferClient = {
    id: () => string;
    beginTransfer: () => void;
    setPriority: (targets: number[], priority: number) => void;
    stopTransfer: () => void;
}

export const createTransferClientFactory = (wsClient: WebSocketClient) => {
    const handlerCollection = new Map<string, TransferredImageHandler>();
    let lastTransferId = 0;

    const make = (
        volumeSpecifier: VolumeSpecifier,
        handler: TransferredImageHandler
    ): TransferClient => {
        const { seriesUid, partialVolumeDescriptor } = volumeSpecifier;
        const transferId = (++lastTransferId).toString();

        const beginTransfer = () => {
            const data = beginTransferMessageData(transferId, seriesUid, partialVolumeDescriptor);
            const message = createMessageBuffer(data);
            wsClient.send(message);

            handlerCollection.set(transferId, handler);
        }

        const setPriority = (targets: number[], priority: number) => {
            const data = setPriorityMessageData(transferId, targets, priority);
            const message = createMessageBuffer(data);
            wsClient.send(message);
        }

        const stopTransfer = () => {
            if (wsClient.connected()) {
                const data = stopTransferMessageData(transferId);
                const message = createMessageBuffer(data);
                wsClient.send(message);
            }

            handlerCollection.delete(transferId);
        }

        const transferClient = {
            id: () => transferId,
            beginTransfer,
            setPriority,
            stopTransfer
        };

        return transferClient;
    };

    // 受信
    wsClient.addMessageEventListener(e => {

        const { data: message } = e;
        if (typeof message === 'string') return;

        const { data, buffer } = parseMessageBuffer(message);

        if (isImageTransferData(data)) {

            if (data.messageType === MessageDataType.TRANSFER_IMAGE) {
                const { transferId, imageNo } = data;
                if (handlerCollection.has(transferId)) {
                    const handler = handlerCollection.get(transferId)!;
                    handler(imageNo, buffer!);
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

    return { make };
};
