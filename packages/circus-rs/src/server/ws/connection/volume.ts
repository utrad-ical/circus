import WebSocketConnectionHandler from './WebSocketConnectionHandler';
import {
  createMessageBuffer,
  ImageTransferMessageData,
  isImageTransferData,
  parseMessageBuffer,
  TransferImageMessage
} from '../../../common/ws/message';
import { IncomingMessage } from 'http';

import createImageTransferAgent from '../image-transfer-agent';
import { VolumeProvider } from '../../helper/createVolumeProvider';

let lastWsConnectionId = 0;

type AuthFunction = (seriesUid: string) => Promise<boolean>;
export type AuthFunctionProvider = (req: IncomingMessage) => AuthFunction;
type Option = {
  authFunctionProvider: AuthFunctionProvider;
  volumeProvider: VolumeProvider;
};

const volume: (option: Option) => WebSocketConnectionHandler = ({
  volumeProvider,
  authFunctionProvider
}) => {
  return (ws, req) => {
    const connectionId = ++lastWsConnectionId;
    // console.log(`${connectionId}: Open`);

    const authFunction = authFunctionProvider(req);

    ws.binaryType = 'arraybuffer';

    const untilBufferIsFlushed = () =>
      new Promise<void>(resolve => {
        const check = () =>
          void (0 === ws.bufferedAmount ? resolve() : setImmediate(check));
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

    const { beginTransfer, getConnection, dispose } = createImageTransferAgent({
      imageDataEmitter,
      volumeProvider
    });

    ws.on('close', () => {
      // console.log(`${connectionId}: Close`);
      dispose();
    });

    const checkingAccessRights = new Map<string, Promise<void>>();

    const handleMessageData = async (data: ImageTransferMessageData) => {
      switch (data.messageType) {
        case 'BEGIN_TRANSFER': {
          const { transferId, seriesUid, partialVolumeDescriptor } = data;

          // console.log(`tr#${transferId} BEGIN_TRANSFER / ${seriesUid}`);
          let authenticated: () => void = () => {};
          checkingAccessRights.set(
            transferId,
            new Promise(resolve => (authenticated = resolve))
          );

          const hasAccessRight = await authFunction(seriesUid);
          checkingAccessRights.delete(transferId);
          authenticated();

          if (hasAccessRight) {
            await beginTransfer(transferId, seriesUid, partialVolumeDescriptor);
          } else {
            console.error(
              `${connectionId}: Attempted to access ${seriesUid} without proper authorization.`
            );
          }
          break;
        }
        case 'SET_PRIORITY': {
          const { transferId, target, priority } = data;
          await checkingAccessRights.get(transferId);
          (await getConnection(transferId))?.setPriority(target, priority);
          break;
        }
        case 'PAUSE_TRANSFER': {
          const { transferId } = data;
          await checkingAccessRights.get(transferId);
          (await getConnection(transferId))?.pause();
          break;
        }
        case 'RESUME_TRANSFER': {
          const { transferId } = data;
          await checkingAccessRights.get(transferId);
          (await getConnection(transferId))?.resume();
          break;
        }
        case 'ABORT_TRANSFER': {
          const { transferId } = data;
          await checkingAccessRights.get(transferId);
          (await getConnection(transferId))?.abort();
          break;
        }
      }
    };

    ws.on('message', (messageBuffer: ArrayBuffer) => {
      const { data } = parseMessageBuffer(messageBuffer);
      if (isImageTransferData(data)) handleMessageData(data);
    });
  };
};

export default volume;
