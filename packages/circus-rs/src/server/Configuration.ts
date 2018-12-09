import Logger from './helper/logger/Logger';
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
  port: number;

  globalIpFilter: string;

  logger: ModuleDefinition<Logger>;

  dicomFileRepository: ModuleDefinition<DicomFileRepository>;

  imageEncoder: ModuleDefinition<ImageEncoder>;

  cache?: CacheOptions;

  authorization: {
    enabled: boolean;
    expire: number;
    tokenRequestIpFilter: string;
  };
}
