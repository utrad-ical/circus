import DicomVolume from '../../../common/DicomVolume';
import { DicomMetadata } from '../volume-image-source';

export default interface DicomVolumeLoader {
  loadMeta(): Promise<DicomMetadata>;
  loadVolume(): Promise<DicomVolume>;
};
