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
    beginTransfer: (skip?: MultiRangeDescriptor | undefined) => void;
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

        const beginTransfer = (skip?: MultiRangeDescriptor) => {
            const data = beginTransferMessageData(transferId, seriesUid, partialVolumeDescriptor, skip);
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
            const { transferId } = data;
            const handler = handlerCollection.get(transferId);
            if (!handler) {
                const data = stopTransferMessageData(transferId);
                const message = createMessageBuffer(data);
                wsClient.send(message);
            } else if (data.messageType === MessageDataType.TRANSFER_IMAGE) {
                const { imageNo } = data;
                handler(imageNo, buffer!);
            }
        }
    });

    return { make };
};
