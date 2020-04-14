import { Configuration } from '../Configuration';

import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import ImageEncoder from './image-encoder/ImageEncoder';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import { Counter } from './createCounter';
import { VolumeProvider } from './createVolumeProvider';
import path from 'path';
import dicomImageExtractor, {
  DicomImageExtractor
} from '@utrad-ical/circus-lib/lib/image-extractor/dicomImageExtractor';
import ServiceLoader from '@utrad-ical/circus-lib/lib/ServiceLoader';

/**
 * This is a simple facade interface that aggregates helper modules
 */
export interface AppHelpers {
  readonly rsLogger: Logger;
  readonly counter: Counter;
  readonly repository?: DicomFileRepository;
  readonly imageEncoder?: ImageEncoder;
  readonly volumeProvider?: VolumeProvider;
}

export interface Authorizer {
  issueToken: (target: string) => Promise<string | void>;
  checkToken: (token: string, target?: string) => Promise<boolean>;
  dispose?: () => Promise<void>;
}

export default async function prepareHelperModules(
  config: Configuration
): Promise<AppHelpers> {
  const loader = new ServiceLoader<{
    rsLogger: Logger;
    imageEncoder: ImageEncoder;
    dicomImageExtractor: DicomImageExtractor;
    dicomFileRepository: DicomFileRepository;
    volumeProvider: VolumeProvider;
    counter: Counter;
  }>(config as any);
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
    path.join(__dirname, './image-encoder'),
    'PngJsImageEncoder'
  );
  loader.registerModule('counter', path.join(__dirname, 'createCounter'));
  loader.registerFactory('dicomImageExtractor', async () =>
    dicomImageExtractor()
  );
  loader.registerModule(
    'volumeProvider',
    path.join(__dirname, 'createVolumeProvider')
  );

  const rsLogger = await loader.get('rsLogger');

  const counter = await loader.get('counter');
  const repository = await loader.get('dicomFileRepository');
  const imageEncoder = await loader.get('imageEncoder');
  let volumeProvider = await loader.get('volumeProvider');

  return {
    rsLogger,
    counter,
    repository,
    imageEncoder,
    volumeProvider
  };
}
