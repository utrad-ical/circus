import type { FunctionService } from '@utrad-ical/circus-lib';
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
  },
  never
> = async (_opts, { volumeProvider }) => {
  return ({ authFunctionProvider }) =>
    volume({
      volumeProvider,
      authFunctionProvider
    });
};
createWebsocketVolumeConnectionHandlerCreator.dependencies = ['volumeProvider'];

export default createWebsocketVolumeConnectionHandlerCreator;
