import { DicomFileRepository, FunctionService } from '@utrad-ical/circus-lib';
import { DicomExtractorWorker } from '../helper/extractor-worker/createDicomExtractorWorker';
import WebSocketConnectionHandler from './connection/WebSocketConnectionHandler';
import volume, { AuthFunctionProvider } from './connection/volume';

export type RsWebsocketVolumeRoute = (option: { authFunctionProvider: AuthFunctionProvider; }) => WebSocketConnectionHandler;
const createWebsocketVolumeRoute: FunctionService<
  RsWebsocketVolumeRoute,
  {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  },
  never
> = async (_opts, { dicomFileRepository, dicomExtractorWorker }) => {
  return ({ authFunctionProvider }) => volume({
    dicomFileRepository,
    dicomExtractorWorker,
    authFunctionProvider
  });
}
createWebsocketVolumeRoute.dependencies = [
  'dicomFileRepository',
  'dicomExtractorWorker'
];

export default createWebsocketVolumeRoute;
