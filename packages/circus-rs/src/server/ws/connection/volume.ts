import WebSocketConnectionHandler from './WebSocketConnectionHandler';
import {
  createMessageBuffer,
  ImageTransferMessageData,
  isImageTransferData,
  MessageDataType,
  parseMessageBuffer,
  SetPriorityMessageData,
  StopTransferMessageData,
  TransferImageMessage
} from '../../../common/ws/message';
import { IncomingMessage } from 'http';

import createImageTransferAgent from '../image-transfer-agent';
import { VolumeProvider } from '../../helper/createVolumeProvider';
import { console_log } from 'debug';

let lastWsConnectionId = 0;

type AuthFunction = (seriesUid: string) => Promise<boolean>;
export type AuthFunctionProvider = (req: IncomingMessage) => AuthFunction;
type Option = {
  authFunctionProvider: AuthFunctionProvider;
  volumeProvider: VolumeProvider;
};

const volume: (option: Option) => WebSocketConnectionHandler = ({
  volumeProvider,
  authFunctionProvider,
}) => {
  return (ws, req) => {
    const connectionId = ++lastWsConnectionId;
    console.log(`${connectionId}: Open`);

    const authFunction = authFunctionProvider(req);

    ws.binaryType = 'arraybuffer';

    const untilBufferIsFlushed = () => new Promise<void>((resolve) => {
      const check = () => void (0 === ws.bufferedAmount ? resolve() : setImmediate(check));
      check();
    });

    const imageDataEmitter = async (
      data: TransferImageMessage,
      buffer: ArrayBuffer
    ) => {
      await new Promise<void>((resolve, reject) =>
        ws.send(createMessageBuffer(data, buffer), (e?: Error) =>
          e ? reject(e) : resolve()
        )
      );
      await untilBufferIsFlushed();
    };

    const imageTransferAgent = createImageTransferAgent({
      imageDataEmitter,
      volumeProvider,
      connectionId
    });

    ws.on('close', () => {
      console.log(`${connectionId}: Close`);
      imageTransferAgent.dispose();
    });

    const pendings: Map<string, (StopTransferMessageData | SetPriorityMessageData)[]> = new Map;
    const isAcceptable = (data: StopTransferMessageData | SetPriorityMessageData) => {
      const pending = pendings.get(data.transferId);
      pending?.push(data);
      return !pending;
    };

    const handleMessageData = async (data: ImageTransferMessageData) => {
      switch (data.messageType) {
        case MessageDataType.BEGIN_TRANSFER: {
          const { transferId, seriesUid, partialVolumeDescriptor } =
            data;

          console.log(`tr#${transferId} BEGIN_TRANSFER / ${seriesUid}`);

          pendings.set(transferId, []);

          const hasAccessRight = await authFunction(seriesUid);
          if (!hasAccessRight) {
            throw new Error(
              `${connectionId}: Attempted to access ${seriesUid} without proper authorization.`
            );
          }

          await imageTransferAgent.beginTransfer(
            transferId,
            seriesUid,
            partialVolumeDescriptor
          );

          const todos = pendings.get(transferId)!;
          pendings.delete(transferId);

          todos.forEach(data => handleMessageData(data));
          break;
        }
        case MessageDataType.SET_PRIORITY: {
          if (isAcceptable(data)) {
            const { transferId, target, priority } = data;
            console.log(`tr#${transferId} SET_PRIORITY / ${target.toString()}`);
            imageTransferAgent.setPriority(transferId, target, priority);
          }
          break;
        }
        case MessageDataType.STOP_TRANSFER: {
          if (isAcceptable(data)) {
            const { transferId } = data;
            imageTransferAgent.stopTransfer(transferId);
          }
          break;
        }
      }
    };

    ws.on('message', (messageBuffer: ArrayBuffer) => {
      // if (typeof messageBuffer !== 'object' || !(messageBuffer instanceof ArrayBuffer)) {
      //   console.warn('Ignore invalid message below');
      //   console.warn(messageBuffer);
      //   return;
      // }
      const { data } = parseMessageBuffer(messageBuffer);
      if (isImageTransferData(data)) handleMessageData(data);
    });
  };
};

export default volume;
