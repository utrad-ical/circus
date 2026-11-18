import type { FunctionService, Logger } from '@utrad-ical/circus-lib';
import type WebSocketConnectionHandler from './connection/WebSocketConnectionHandler.ts';
import type { AuthFunctionProvider } from './connection/volume.ts';
import volume from './connection/volume.ts';
import type { VolumeProvider } from '../helper/createVolumeProvider.ts';

export type RsWebsocketVolumeConnectionHandlerCreator = (option: {
  authFunctionProvider: AuthFunctionProvider;
}) => WebSocketConnectionHandler;

const createWebsocketVolumeConnectionHandlerCreator: FunctionService<
  RsWebsocketVolumeConnectionHandlerCreator,
  {
    volumeProvider: VolumeProvider;
    logger: Logger;
  },
  never
> = async (_opts, { volumeProvider, logger }) => {
  const volumeLogger = logger.child({ component: 'rs' });
  return ({ authFunctionProvider }) =>
    volume({
      volumeProvider,
      logger: volumeLogger,
      authFunctionProvider
    });
};
createWebsocketVolumeConnectionHandlerCreator.dependencies = [
  'volumeProvider',
  'logger'
];

export default createWebsocketVolumeConnectionHandlerCreator;
