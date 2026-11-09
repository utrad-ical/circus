import type DicomVolume from '../../common/DicomVolume.ts';

export default interface MprImageSourceWithDicomVolume {
  getLoadedDicomVolume: () => DicomVolume | undefined;
}

export function isMprImageSourceWithDicomVolume(
  src: any
): src is MprImageSourceWithDicomVolume {
  return src.getLoadedDicomVolume !== undefined;
}
