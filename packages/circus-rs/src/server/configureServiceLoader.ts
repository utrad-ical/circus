import {
  DicomFileRepository,
  Logger,
  ServiceLoader
} from '@utrad-ical/circus-lib';
import Koa from 'koa';
import path from 'path';
import * as ws from 'ws';
import { Counter } from './helper/createCounter';
import { VolumeProvider } from './helper/createVolumeProvider';
import ImageEncoder from './helper/image-encoder/ImageEncoder';
import { DicomExtractorWorker } from './helper/extractor-worker/createDicomExtractorWorker';
import { RsWebsocketVolumeConnectionHandlerCreator } from './ws/createWebsocketVolumeConnectionHandlerCreator';

export interface RsServices {
  rsServer: Koa;
  rsLogger: Logger;
  counter: Counter;
  dicomFileRepository: DicomFileRepository;
  dicomExtractorWorker: DicomExtractorWorker;
  imageEncoder: ImageEncoder;
  rsSeriesRoutes: Koa.Middleware;
  volumeProvider: VolumeProvider;
  rsWSServer: ws.Server;
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
    path.join(__dirname, 'helper/image-encoder'),
    'PngJsImageEncoder'
  );
  loader.registerModule(
    'counter',
    path.join(__dirname, 'helper/createCounter')
  );
  loader.registerModule(
    'dicomExtractorWorker',
    path.join(__dirname, 'helper/extractor-worker/createDicomExtractorWorker')
  );
  loader.registerModule(
    'rsSeriesRoutes',
    path.join(__dirname, 'app/series/createSeriesRoutes.ts')
  );
  loader.registerModule(
    'volumeProvider',
    path.join(__dirname, 'helper/createVolumeProvider')
  );
  loader.registerModule(
    'rsWSServer',
    path.join(__dirname, 'ws/createWSServer')
  );
  loader.registerModule(
    'rsWebsocketVolumeConnectionHandlerCreator',
    path.join(__dirname, 'ws/createWebsocketVolumeConnectionHandlerCreator')
  );
  loader.registerModule('rsServer', path.join(__dirname, './createServer'));
};

export default configureServiceLoader;
