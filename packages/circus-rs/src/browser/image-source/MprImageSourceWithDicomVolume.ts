import DicomVolume from '../../common/DicomVolume';

export default interface MprImageSourceWithDicomVolume {
  getLoadedDicomVolume: () => DicomVolume | undefined;
}

export function isMprImageSourceWithDicomVolume(
  src: any
): src is MprImageSourceWithDicomVolume {
  return src.getLoadedDicomVolume !== undefined;
}
