import { FunctionService } from '@utrad-ical/circus-lib';
import WebSocketConnectionHandler from './connection/WebSocketConnectionHandler';
import volume, { AuthFunctionProvider } from './connection/volume';
import { VolumeProvider } from '../helper/createVolumeProvider';

export type RsWebsocketVolumeRoute = (option: { authFunctionProvider: AuthFunctionProvider; }) => WebSocketConnectionHandler;
const createWebsocketVolumeRoute: FunctionService<
  RsWebsocketVolumeRoute,
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
createWebsocketVolumeRoute.dependencies = ['volumeProvider'];

export default createWebsocketVolumeRoute;
