import WebSocketConnectionHandler from './WebSocketConnectionHandler';
import {
  createMessageBuffer,
  isImageTransferData,
  MessageDataType,
  parseMessageBuffer,
  TransferImageMessage
} from '../../../common/ws/message';
import { IncomingMessage } from 'http';

import createImageTransferAgent from '../image-transfer-agent';
import { DicomFileRepository } from '@utrad-ical/circus-lib';
import { DicomExtractorWorker } from '../../helper/extractor-worker/createDicomExtractorWorker';

let lastWsConnectionId = 0;

type AuthFunction = (seriesUid: string) => Promise<boolean>;
export type AuthFunctionProvider = (req: IncomingMessage) => AuthFunction;
type Option = {
  authFunctionProvider: AuthFunctionProvider;
  dicomFileRepository: DicomFileRepository;
  dicomExtractorWorker: DicomExtractorWorker;
};

const volume: (option: Option) => WebSocketConnectionHandler = ({
  authFunctionProvider,
  dicomFileRepository,
  dicomExtractorWorker
}) => {
  return (ws, req) => {
    const connectionId = ++lastWsConnectionId;
    console.log(`${connectionId}: Open`);

    const authFunction = authFunctionProvider(req);

    ws.binaryType = 'arraybuffer';

    const imageDataEmitter = (
      data: TransferImageMessage,
      buffer: ArrayBuffer
    ) =>
      new Promise<void>((resolve, reject) =>
        ws.send(createMessageBuffer(data, buffer), (e?: Error) =>
          e ? reject(e) : resolve()
        )
      );

    const imageTransferAgent = createImageTransferAgent(
      imageDataEmitter,
      dicomFileRepository,
      dicomExtractorWorker,
      { connectionId }
    );

    ws.on('close', () => {
      console.log(`${connectionId}: Close`);
      imageTransferAgent.dispose();
    });

    ws.on('message', async (messageBuffer: ArrayBuffer) => {
      // if (typeof messageBuffer !== 'object' || !(messageBuffer instanceof ArrayBuffer)) {
      //   console.warn('Ignore invalid message below');
      //   console.warn(messageBuffer);
      //   return;
      // }

      const { data } = parseMessageBuffer(messageBuffer);

      if (isImageTransferData(data)) {
        switch (data.messageType) {
          case MessageDataType.BEGIN_TRANSFER: {
            const { transferId, seriesUid, partialVolumeDescriptor, skip } =
              data;
            const hasAccessRight = await authFunction(seriesUid);
            if (!hasAccessRight) {
              throw new Error(
                `${connectionId}: Attempted to access ${seriesUid} without proper authorization.`
              );
            }

            imageTransferAgent.beginTransfer(
              transferId,
              seriesUid,
              partialVolumeDescriptor,
              skip
            );
            break;
          }
          case MessageDataType.SET_PRIORITY: {
            const { transferId, target, priority } = data;
            imageTransferAgent.setPriority(transferId, target, priority);
            break;
          }
          case MessageDataType.STOP_TRANSFER: {
            const { transferId } = data;
            imageTransferAgent.stopTransfer(transferId);
            break;
          }
        }
      }
    });
  };
};

export default volume;
