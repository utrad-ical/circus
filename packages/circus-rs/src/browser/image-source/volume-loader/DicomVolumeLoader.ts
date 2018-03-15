import DicomVolume from '../../../common/DicomVolume';
import { PixelFormat, pixelFormatInfo } from '../../../common/PixelFormat';
import { RsHttpClient } from '../../http-client/rs-http-client';
import IndexedDbCache from '../../util/IndexedDbCache';
import { ViewWindow } from '../../../common/ViewWindow';

export interface DicomMetadata {
  dicomWindow?: ViewWindow;
  estimatedWindow?: ViewWindow;
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  pixelFormat: PixelFormat;
}

export default interface DicomVolumeLoader {
  loadMeta(): Promise<DicomMetadata>;
  loadVolume(): Promise<DicomVolume>;
}
