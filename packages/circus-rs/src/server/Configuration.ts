import Logger from './helper/logger/Logger';
import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';
import ImageEncoder from './helper/image-encoder/ImageEncoder';

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

  cache: {
    memoryThreshold: number;
    maxAge: number;
  };

  authorization: {
    enabled: boolean;
    expire: number;
    tokenRequestIpFilter: string;
  };
}
