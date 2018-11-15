import { Configuration, ModuleDefinition } from '../Configuration';

import Logger from './logger/Logger';
import NullLogger from './logger/NullLogger';
import ImageEncoder from './image-encoder/ImageEncoder';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import Counter from './Counter';
import createAuthorizer from './createAuthorizer';
import {
  VolumeProvider,
  createVolumeProvider,
  VolumeAccessor
} from './createVolumeProvider';
import dicomImageExtractor from '../../common/dicomImageExtractor';
import LRU from 'lru-cache';

/**
 * This is a simple facade interface that aggregates helper modules
 */
export interface AppHelpers {
  readonly logger: Logger;
  readonly authorizer?: Authorizer;
  readonly counter: Counter;
  readonly repository?: DicomFileRepository;
  readonly imageEncoder?: ImageEncoder;
  readonly volumeProvider?: VolumeProvider;
  readonly cache?: LRU.Cache<string, VolumeAccessor>;
}

export interface Authorizer {
  issueToken: (target: string) => Promise<string | void>;
  checkToken: (token: string, target?: string) => Promise<boolean>;
  dispose?: () => Promise<void>;
}

/**
 *
 */
const loadedModuleNames: string[] = [];

export default async function loadHelperModules(
  config: Configuration
): Promise<AppHelpers> {
  // logger
  let logger: Logger;
  if (config.logger) {
    logger = await loadModule<Logger>('logger', './logger', config.logger);
  } else {
    loadedModuleNames.push('(default null logger)');
    logger = NullLogger();
  }

  // authorizer
  let authorizer: Authorizer | undefined = undefined;
  if (config.authorization && config.authorization.enabled) {
    authorizer = createAuthorizer(config.authorization);
    loadedModuleNames.push('authorizer');
  }

  // counter
  let counter = new Counter();
  loadedModuleNames.push('Counter');

  // dicomFileRepository
  let repository: DicomFileRepository | undefined = undefined;
  if (config.dicomFileRepository) {
    repository = await loadModule<DicomFileRepository>(
      'dicom file repository',
      '@utrad-ical/circus-lib/lib/dicom-file-repository/lib',
      config.dicomFileRepository
    );
  }

  // imageEncoder
  let imageEncoder: ImageEncoder | undefined = undefined;
  if (config.imageEncoder) {
    imageEncoder = await loadModule<ImageEncoder>(
      'image encoder',
      './image-encoder',
      config.imageEncoder
    );
  }

  // volumeProvider
  let volumeProvider: VolumeProvider | undefined = undefined;
  if (repository) {
    const extractor = dicomImageExtractor();
    volumeProvider = createVolumeProvider(repository, extractor);
    loadedModuleNames.push('volumeProvider');
  }

  // cache
  let cache: LRU.Cache<string, VolumeAccessor> | undefined = undefined;
  if (volumeProvider && config.cache) {
    const { memoryThreshold = 2147483648, maxAge = 3600 } = config.cache;
    cache = new LRU<string, VolumeAccessor>({
      length: volumeAccessor => {
        // In practice, metadata and so on need to be considered,
        // but it is much smaller than the image,
        // so it is not taken into consideration.
        return volumeAccessor.volume.data.byteLength;
      },
      max: memoryThreshold,
      maxAge: maxAge
    });
    loadedModuleNames.push('LRU');

    volumeProvider = bindCache(cache)(volumeProvider);
  }

  logger.info('Modules loaded: ', loadedModuleNames.join(', '));

  return {
    logger,
    authorizer,
    counter,
    repository,
    imageEncoder,
    volumeProvider,
    cache
  };
}

export async function disposeHelperModules(modules: AppHelpers): Promise<void> {
  if (modules.authorizer && modules.authorizer.dispose !== undefined)
    modules.authorizer.dispose();
  if (modules.logger.shutdown !== undefined) await modules.logger.shutdown();
}

async function loadModule<T>(
  title: string,
  baseDir: string,
  config: ModuleDefinition<T>
): Promise<T> {
  const { module, options } = config;
  let instance: T;
  let name: string;
  if (typeof module === 'string') {
    name = module;
    if (/\\/.test(module)) {
      const { default: TheClass } = await import(`${module}`);
      instance = new TheClass(options);
    } else {
      const { default: TheClass } = await import(`${baseDir}/${module}`);
      instance = new TheClass(options);
    }
  } else {
    name = `(customized ${title})`;
    instance = module;
  }
  loadedModuleNames.push(name);

  return instance;
}

function bindCache(
  cache: LRU.Cache<string, VolumeAccessor>
): (provider: VolumeProvider) => VolumeProvider {
  return function(provider) {
    return async (seriesUID: string) => {
      if (cache.has(seriesUID)) return cache.get(seriesUID)!;
      const volumeLoader = await provider(seriesUID);
      cache.set(seriesUID, volumeLoader);
      return volumeLoader;
    };
  };
}
