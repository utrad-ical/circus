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
import { MultiRange } from 'multi-integer-range';

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

    const pendings = new Map<string, Promise<void>>();

    const handleMessageData = async (data: ImageTransferMessageData) => {
      switch (data.messageType) {
        case MessageDataType.BEGIN_TRANSFER: {
          const { transferId, seriesUid, partialVolumeDescriptor } =
            data;

          console.log(`tr#${transferId} BEGIN_TRANSFER / ${seriesUid}`);

          let flushPendings: () => void = () => { };
          pendings.set(transferId, new Promise<void>((resolve) => flushPendings = resolve));

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

          flushPendings();
          pendings.delete(transferId);
          break;
        }
        case MessageDataType.SET_PRIORITY: {
          const { transferId, target, priority } = data;
          await pendings.get(transferId);
          console.log(`tr#${transferId} SET_PRIORITY / ${new MultiRange(target).toString()}`);
          imageTransferAgent.setPriority(transferId, target, priority);
          break;
        }
        case MessageDataType.STOP_TRANSFER: {
          const { transferId } = data;
          await pendings.get(transferId);
          imageTransferAgent.stopTransfer(transferId);
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
