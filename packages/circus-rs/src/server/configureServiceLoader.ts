import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import dicomImageExtractor, {
  DicomImageExtractor
} from '@utrad-ical/circus-lib/lib/image-extractor/dicomImageExtractor';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import ServiceLoader from '@utrad-ical/circus-lib/lib/ServiceLoader';
import Koa from 'koa';
import path from 'path';
import { Counter } from './helper/createCounter';
import { VolumeProvider } from './helper/createVolumeProvider';
import ImageEncoder from './helper/image-encoder/ImageEncoder';

export interface RsServices {
  rsServer: Koa;
  rsLogger: Logger;
  counter: Counter;
  dicomFileRepository: DicomFileRepository;
  dicomImageExtractor: DicomImageExtractor;
  imageEncoder: ImageEncoder;
  volumeProvider: VolumeProvider;
}

const configureServiceLoader = (loader: ServiceLoader<any>): void => {
  loader.registerDirectory(
    'rsLogger',
    '@utrad-ical/circus-lib/lib/logger',
    'NullLogger'
  );
  loader.registerDirectory(
    'dicomFileRepository',
    '@utrad-ical/circus-lib/lib/dicom-file-repository',
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
  loader.registerFactory('dicomImageExtractor', async () =>
    dicomImageExtractor()
  );
  loader.registerModule(
    'volumeProvider',
    path.join(__dirname, 'helper/createVolumeProvider')
  );
  loader.registerModule('rsServer', path.join(__dirname, './createServer'));
};

export default configureServiceLoader;
