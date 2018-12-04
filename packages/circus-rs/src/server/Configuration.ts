import Logger from './helper/logger/Logger';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import ImageEncoder from './helper/image-encoder/ImageEncoder';
import { VolumeAccessorCacheOptions } from './helper/createVolumeAccessorCache';

export interface ModuleDefinition<T = string> {
  module: string | T;
  options?: any;
}

export interface Configuration {
  port: number;

  globalIpFilter: string;

  logger: ModuleDefinition<Logger>;

  dicomFileRepository: ModuleDefinition<DicomFileRepository>;

  imageEncoder: ModuleDefinition<ImageEncoder>;

  cache?: VolumeAccessorCacheOptions;

  authorization: {
    enabled: boolean;
    expire: number;
    tokenRequestIpFilter: string;
  };
}
