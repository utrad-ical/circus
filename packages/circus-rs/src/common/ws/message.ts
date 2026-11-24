import type PartialVolumeDescriptor from '../../volume/PartialVolumeDescriptor.ts';

const endOfJson = 0x0a;

export function createMessageBuffer(data: any, buffer?: ArrayBuffer) {
  const jsonText = JSON.stringify(data);
  const jsonBuffer = new TextEncoder().encode(jsonText);

  const bufferBytes = buffer ? buffer.byteLength : 0;
  const messageBuffer = new ArrayBuffer(
    jsonBuffer.byteLength + 1 + bufferBytes
  );

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
    throw new TypeError('The specified buffer is not parsable.');
  }

  const jsonBuffer = new Uint8Array(messageBuffer, 0, endOfJsonIndex);
  const jsonText = new TextDecoder().decode(jsonBuffer);
  try {
    const data = JSON.parse(jsonText);
    const buffer =
      endOfJsonIndex + 1 < messageBuffer.byteLength
        ? messageBuffer.slice(endOfJsonIndex + 1)
        : undefined;
    return { data, buffer };
  } catch (e) {
    throw new TypeError('The specified buffer has invalid JSON part.');
  }
}

const messageDataTypes = [
  'BEGIN_TRANSFER',
  'SET_PRIORITY',
  'ABORT_TRANSFER',
  'PAUSE_TRANSFER',
  'RESUME_TRANSFER',
  'TRANSFER_IMAGE',
  'TRANSFER_ERROR',
  'IMAGE_RECEIVED'
] as const;

export type MessageDataType = (typeof messageDataTypes)[number];

export type ImageTransferMessageData =
  | BeginTransferMessageData
  | PauseTransferMessageData
  | ResumeTransferMessageData
  | AbortTransferMessageData
  | SetPriorityMessageData
  | TransferImageMessage
  | TransferErrorMessage
  | ImageReceivedMessageData;

export type BeginTransferMessageData = {
  messageType: 'BEGIN_TRANSFER';
  transferId: string;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  /**
   * The number of images the server may send before the client acknowledges
   * them with IMAGE_RECEIVED. Unlimited if omitted.
   */
  windowSize?: number;
};

/** Acknowledges an image of the transfer (when `windowSize` is used) */
export type ImageReceivedMessageData = {
  messageType: 'IMAGE_RECEIVED';
  transferId: string;
};

export type SetPriorityMessageData = {
  messageType: 'SET_PRIORITY';
  transferId: string;
  target: number | number[];
  priority: number;
};

export type AbortTransferMessageData = {
  messageType: 'ABORT_TRANSFER';
  transferId: string;
};

export type PauseTransferMessageData = {
  messageType: 'PAUSE_TRANSFER';
  transferId: string;
};

export type ResumeTransferMessageData = {
  messageType: 'RESUME_TRANSFER';
  transferId: string;
};

export type TransferImageMessage = {
  messageType: 'TRANSFER_IMAGE';
  transferId: string;
  imageIndex: number;
};

/** Tells the client that the transfer failed and has been aborted */
export type TransferErrorMessage = {
  messageType: 'TRANSFER_ERROR';
  transferId: string;
  /** A message that can be shown to the user */
  message: string;
};

export function isImageTransferData(r: any): r is ImageTransferMessageData {
  return (
    typeof r === 'object' &&
    typeof r.messageType === 'string' &&
    messageDataTypes.some(v => v === r.messageType)
  );
}

export function beginTransferMessageData(
  transferId: string,
  seriesUid: string,
  partialVolumeDescriptor?: PartialVolumeDescriptor,
  windowSize?: number
): BeginTransferMessageData {
  return {
    messageType: 'BEGIN_TRANSFER',
    transferId,
    seriesUid,
    partialVolumeDescriptor,
    windowSize
  };
}

export function setPriorityMessageData(
  transferId: string,
  target: number | number[],
  priority: number
): SetPriorityMessageData {
  return { messageType: 'SET_PRIORITY', transferId, target, priority };
}

export function stopTransferMessageData(
  transferId: string
): AbortTransferMessageData {
  return { messageType: 'ABORT_TRANSFER', transferId };
}

export function pauseTransferMessageData(
  transferId: string
): PauseTransferMessageData {
  return { messageType: 'PAUSE_TRANSFER', transferId };
}

export function resumeTransferMessageData(
  transferId: string
): ResumeTransferMessageData {
  return { messageType: 'RESUME_TRANSFER', transferId };
}

export function transferImageMessageData(
  transferId: string,
  imageIndex: number
): TransferImageMessage {
  return { messageType: 'TRANSFER_IMAGE', transferId, imageIndex };
}

export function transferErrorMessageData(
  transferId: string,
  message: string
): TransferErrorMessage {
  return { messageType: 'TRANSFER_ERROR', transferId, message };
}

export function imageReceivedMessageData(
  transferId: string
): ImageReceivedMessageData {
  return { messageType: 'IMAGE_RECEIVED', transferId };
}
