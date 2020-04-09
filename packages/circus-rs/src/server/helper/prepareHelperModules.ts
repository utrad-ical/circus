import { Configuration, ModuleDefinition } from '../Configuration';

import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import ImageEncoder from './image-encoder/ImageEncoder';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import { Counter } from './createCounter';
import createAuthorizer from './createAuthorizer';
import {
  VolumeProvider,
  createVolumeProvider,
  VolumeAccessor
} from './createVolumeProvider';
import path from 'path';
import dicomImageExtractor from '@utrad-ical/circus-lib/lib/image-extractor/dicomImageExtractor';
import asyncMemoize, { AsyncCachedLoader } from '../../common/asyncMemoize';
import ServiceLoader from '@utrad-ical/circus-lib/lib/ServiceLoader';

/**
 * This is a simple facade interface that aggregates helper modules
 */
export interface AppHelpers {
  readonly logger: Logger;
  readonly authorizer?: Authorizer;
  readonly counter: Counter;
  readonly repository?: DicomFileRepository;
  readonly imageEncoder?: ImageEncoder;
  readonly volumeProvider?: VolumeProvider | AsyncCachedLoader<VolumeAccessor>;
}

export interface Authorizer {
  issueToken: (target: string) => Promise<string | void>;
  checkToken: (token: string, target?: string) => Promise<boolean>;
  dispose?: () => Promise<void>;
}

const loadedModuleNames: string[] = [];

export default async function prepareHelperModules(
  config: Configuration
): Promise<AppHelpers> {
  const loader = new ServiceLoader<{
    rsLogger: Logger;
    imageEncoder: ImageEncoder;
    dicomFileRepository: DicomFileRepository;
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
  loader.registerModule('counter', path.join(__dirname, './createCounter'));

  // logger
  const logger = await loader.get('rsLogger');

  // authorizer
  let authorizer: Authorizer | undefined = undefined;
  if (
    config.rsServer.options.authorization &&
    config.rsServer.options.authorization.enabled
  ) {
    authorizer = createAuthorizer(config.rsServer.options.authorization);
    loadedModuleNames.push('authorizer');
  }

  // counter
  let counter = await loader.get('counter');

  // dicomFileRepository
  const repository = await loader.get('dicomFileRepository');

  // imageEncoder
  const imageEncoder = await loader.get('imageEncoder');

  // volumeProvider
  let volumeProvider:
    | VolumeProvider
    | AsyncCachedLoader<VolumeAccessor>
    | undefined = undefined;
  if (repository) {
    const extractor = dicomImageExtractor();
    volumeProvider = createVolumeProvider(repository, extractor);
    loadedModuleNames.push('volumeProvider');
  }

  // cache
  if (volumeProvider && config.cache) {
    const { memoryThreshold = 2147483648, maxAge = 3600 } = config.cache;

    volumeProvider = asyncMemoize<VolumeAccessor>(volumeProvider, {
      max: memoryThreshold,
      maxAge: maxAge * 1000,
      length: accessor => accessor.volume.data.byteLength
    });

    loadedModuleNames.push('cache');
  }

  logger.info('Modules loaded: ', loadedModuleNames.join(', '));

  return {
    logger,
    authorizer,
    counter,
    repository,
    imageEncoder,
    volumeProvider
  };
}

export async function disposeHelperModules(modules: AppHelpers): Promise<void> {
  if (modules.authorizer && modules.authorizer.dispose !== undefined)
    modules.authorizer.dispose();
  if (modules.logger.shutdown !== undefined) await modules.logger.shutdown();
}
