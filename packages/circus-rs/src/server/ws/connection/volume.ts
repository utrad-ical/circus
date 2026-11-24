import type WebSocketConnectionHandler from './WebSocketConnectionHandler.ts';
import type {
  ImageTransferMessageData,
  TransferImageMessage
} from '../../../common/ws/message.ts';
import {
  createMessageBuffer,
  isImageTransferData,
  parseMessageBuffer
} from '../../../common/ws/message.ts';
import type { IncomingMessage } from 'http';
import type { Logger } from '@utrad-ical/circus-lib';

import createImageTransferAgent from '../image-transfer-agent.ts';
import type { VolumeProvider } from '../../helper/createVolumeProvider.ts';

let lastWsConnectionId = 0;

type AuthFunction = (seriesUid: string) => Promise<boolean>;
export type AuthFunctionProvider = (req: IncomingMessage) => AuthFunction;
type Option = {
  authFunctionProvider: AuthFunctionProvider;
  volumeProvider: VolumeProvider;
  logger: Logger;
};

const volume: (option: Option) => WebSocketConnectionHandler = ({
  volumeProvider,
  logger,
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
      volumeProvider,
      logger
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
            logger.warn({ connectionId }, 'RS WebSocket volume access denied');
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
      if (!isImageTransferData(data)) return;
      handleMessageData(data).catch(err =>
        logger.error({ err, connectionId }, 'RS WebSocket message failed')
      );
    });
  };
};

export default volume;
