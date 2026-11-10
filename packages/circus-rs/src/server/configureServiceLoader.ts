import type {
  DicomFileRepository,
  Logger,
  ServiceLoader
} from '@utrad-ical/circus-lib';
import type Koa from 'koa';
import path from 'path';
import type * as ws from 'ws';
import type { Counter } from './helper/createCounter.ts';
import type { VolumeProvider } from './helper/createVolumeProvider.ts';
import type ImageEncoder from './helper/image-encoder/ImageEncoder.ts';
import type { DicomExtractorWorker } from './helper/extractor-worker/createDicomExtractorWorker.ts';
import type { RsWebsocketVolumeConnectionHandlerCreator } from './ws/createWebsocketVolumeConnectionHandlerCreator.ts';

export interface RsServices {
  rsServer: Koa;
  rsLogger: Logger;
  counter: Counter;
  dicomFileRepository: DicomFileRepository;
  dicomExtractorWorker: DicomExtractorWorker;
  imageEncoder: ImageEncoder;
  rsSeriesRoutes: Koa.Middleware;
  volumeProvider: VolumeProvider;
  rsWSServer: ws.WebSocketServer;
  rsWebsocketVolumeConnectionHandlerCreator: RsWebsocketVolumeConnectionHandlerCreator;
}

const configureServiceLoader = (loader: ServiceLoader<any>): void => {
  loader.registerDirectory('rsLogger', '<circus-lib>/logger', 'NullLogger');
  loader.registerDirectory(
    'dicomFileRepository',
    '<circus-lib>/dicom-file-repository',
    'MemoryDicomFileRepository'
  );
  loader.registerDirectory(
    'imageEncoder',
    path.join(import.meta.dirname, 'helper/image-encoder'),
    'PngJsImageEncoder'
  );
  loader.registerModule(
    'counter',
    path.join(import.meta.dirname, 'helper/createCounter')
  );
  loader.registerModule(
    'dicomExtractorWorker',
    path.join(
      import.meta.dirname,
      'helper/extractor-worker/createDicomExtractorWorker'
    )
  );
  loader.registerModule(
    'rsSeriesRoutes',
    path.join(import.meta.dirname, 'app/series/createSeriesRoutes')
  );
  loader.registerModule(
    'volumeProvider',
    path.join(import.meta.dirname, 'helper/createVolumeProvider')
  );
  loader.registerModule(
    'rsWSServer',
    path.join(import.meta.dirname, 'ws/createWSServer')
  );
  loader.registerModule(
    'rsWebsocketVolumeConnectionHandlerCreator',
    path.join(
      import.meta.dirname,
      'ws/createWebsocketVolumeConnectionHandlerCreator'
    )
  );
  loader.registerModule(
    'rsServer',
    path.join(import.meta.dirname, './createServer')
  );
};

export default configureServiceLoader;
