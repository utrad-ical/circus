import { FunctionService } from '@utrad-ical/circus-lib';
import WebSocketConnectionHandler from './connection/WebSocketConnectionHandler';
import volume, { AuthFunctionProvider } from './connection/volume';
import { VolumeProvider } from '../helper/createVolumeProvider';

export type RsWebsocketVolumeConnectionHandlerCreator
  = (option: { authFunctionProvider: AuthFunctionProvider; }) => WebSocketConnectionHandler;

const createWebsocketVolumeConnectionHandlerCreator: FunctionService<
  RsWebsocketVolumeConnectionHandlerCreator,
  {
    volumeProvider: VolumeProvider;
  },
  never
> = async (_opts, { volumeProvider }) => {
  return ({ authFunctionProvider }) => volume({
    volumeProvider,
    authFunctionProvider
  });
}
createWebsocketVolumeConnectionHandlerCreator.dependencies = ['volumeProvider'];

export default createWebsocketVolumeConnectionHandlerCreator;
