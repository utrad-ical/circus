import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import ImageEncoder from './helper/image-encoder/ImageEncoder';

export interface ModuleDefinition<T = string> {
  module: string | T;
  options?: any;
}

interface CacheOptions {
  memoryThreshold?: number; // in bytes
  maxAge?: number; // in seconds
}

export interface Configuration {
  rsServer: {
    options: {
      port: number;
      globalIpFilter: string;
      authorization: {
        enabled: boolean;
        expire: number;
        tokenRequestIpFilter: string;
      };
    };
  };

  logger: ModuleDefinition<Logger>;

  dicomFileRepository: ModuleDefinition<DicomFileRepository>;

  imageEncoder: ModuleDefinition<ImageEncoder>;

  cache?: CacheOptions;
}
