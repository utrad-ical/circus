import { Configuration, ModuleDefinition } from '../Configuration';

import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import NullLogger from '@utrad-ical/circus-lib/lib/logger/NullLogger';
import ImageEncoder from './image-encoder/ImageEncoder';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import Counter from './Counter';
import createAuthorizer from './createAuthorizer';
import {
  VolumeProvider,
  createVolumeProvider,
  VolumeAccessor
} from './createVolumeProvider';
import dicomImageExtractor from '@utrad-ical/circus-lib/lib/image-extractor/dicomImageExtractor';
import asyncMemoize, { AsyncCachedLoader } from '../../common/asyncMemoize';

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
  // logger
  let logger: Logger;
  if (config.logger) {
    logger = await loadModule<Logger>(
      'logger',
      '@utrad-ical/circus-lib/lib/logger',
      config.logger
    );
  } else {
    loadedModuleNames.push('(default null logger)');
    logger = await NullLogger({}, {});
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
      '@utrad-ical/circus-lib/lib/dicom-file-repository',
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
      instance = /logger|encoder/.test(title)
        ? await TheClass(options, {})
        : new TheClass(options);
    }
  } else {
    name = `(customized ${title})`;
    instance = module;
  }
  loadedModuleNames.push(name);

  return instance;
}
