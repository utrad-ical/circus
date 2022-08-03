import { PartialVolumeDescriptor } from "@utrad-ical/circus-lib";

const endOfJson = 0x0a;

export function createMessageBuffer(data: any, buffer?: ArrayBuffer) {
    const jsonText = JSON.stringify(data);
    const jsonBuffer = new TextEncoder().encode(jsonText);

    const bufferBytes = buffer ? buffer.byteLength : 0;
    const messageBuffer = new ArrayBuffer(jsonBuffer.byteLength + 1 + bufferBytes);

    const view = new Uint8Array(messageBuffer);
    view.set(jsonBuffer, 0);
    view.set([endOfJson], jsonBuffer.byteLength);
    if (buffer) view.set(new Uint8Array(buffer), jsonBuffer.byteLength + 1);

    return messageBuffer;
}

export function parseMessageBuffer(messageBuffer: ArrayBuffer) {
    const messageView = new Uint8Array(messageBuffer);
    const endOfJsonIndex = messageView.indexOf(endOfJson);
    if (-1 === endOfJsonIndex) {
        throw new TypeError('The specified buffer is not parsable.')
    }

    const jsonBuffer = new Uint8Array(messageBuffer, 0, endOfJsonIndex);
    const jsonText = new TextDecoder().decode(jsonBuffer);
    try {
        const data = JSON.parse(jsonText);
        const buffer = (endOfJsonIndex + 1) < messageBuffer.byteLength
            ? messageBuffer.slice(endOfJsonIndex + 1)
            : undefined;
        return { data, buffer };
    } catch (e) {
        throw new TypeError('The specified buffer has invalid JSON part.')
    }
}

export const MessageDataType = {
    BEGIN_TRANSFER: 'BEGIN_TRANSFER',
    SET_PRIORITY: 'SET_PRIORITY',
    ABORT_TRANSFER: 'ABORT_TRANSFER',
    PAUSE_TRANSFER: 'PAUSE_TRANSFER',
    RESUME_TRANSFER: 'RESUME_TRANSFER',
    TRANSFER_IMAGE: 'TRANSFER_IMAGE',
} as const;

export type MessageDataType = typeof MessageDataType[keyof typeof MessageDataType];

export type ImageTransferMessageData =
    | BeginTransferMessageData
    | PauseTransferMessageData
    | ResumeTransferMessageData
    | AbortTransferMessageData
    | SetPriorityMessageData
    | TransferImageMessage;

export type BeginTransferMessageData = {
    messageType: typeof MessageDataType.BEGIN_TRANSFER;
    transferId: string;
    seriesUid: string;
    partialVolumeDescriptor?: PartialVolumeDescriptor;
};

export type SetPriorityMessageData = {
    messageType: typeof MessageDataType.SET_PRIORITY;
    transferId: string;
    target: number | number[];
    priority: number;
};

export type AbortTransferMessageData = {
    messageType: typeof MessageDataType.ABORT_TRANSFER;
    transferId: string;
};

export type PauseTransferMessageData = {
    messageType: typeof MessageDataType.PAUSE_TRANSFER;
    transferId: string;
};

export type ResumeTransferMessageData = {
    messageType: typeof MessageDataType.RESUME_TRANSFER;
    transferId: string;
};

export type TransferImageMessage = {
    messageType: typeof MessageDataType.TRANSFER_IMAGE;
    transferId: string;
    imageIndex: number;
}

export function isImageTransferData(r: any): r is ImageTransferMessageData {
    return typeof r === 'object'
        && typeof r.messageType === 'string'
        && Object.values(MessageDataType).some(v => v === r.messageType);
}

export function beginTransferMessageData(
    transferId: string,
    seriesUid: string,
    partialVolumeDescriptor?: PartialVolumeDescriptor
): BeginTransferMessageData {
    return { messageType: MessageDataType.BEGIN_TRANSFER, transferId, seriesUid, partialVolumeDescriptor };
}

export function setPriorityMessageData(
    transferId: string,
    target: number | number[],
    priority: number
): SetPriorityMessageData {
    return { messageType: MessageDataType.SET_PRIORITY, transferId, target, priority };
}

export function stopTransferMessageData(transferId: string): AbortTransferMessageData {
    return { messageType: MessageDataType.ABORT_TRANSFER, transferId };
}

export function pauseTransferMessageData(transferId: string): PauseTransferMessageData {
    return { messageType: MessageDataType.PAUSE_TRANSFER, transferId };
}

export function resumeTransferMessageData(transferId: string): ResumeTransferMessageData {
    return { messageType: MessageDataType.RESUME_TRANSFER, transferId };
}

export function transferImageMessageData(transferId: string, imageIndex: number): TransferImageMessage {
    return { messageType: MessageDataType.TRANSFER_IMAGE, transferId, imageIndex };
}
