import DicomDumper from './DicomDumper';
import { PixelFormat } from '../../common/PixelFormat';
import DicomVolume from '../../common/DicomVolume';
import { SeriesLoaderInfo } from '../dicom-file-repository/DicomFileRepository';

/**
 * MockDicomDumper creates dummy volume data.
 */
export default class MockDicomDumper extends DicomDumper {
  public readDicom(
    seriesLoaderInfo: SeriesLoaderInfo,
    config: any
  ): Promise<DicomVolume> {
    let vol = this.makeMockVol();
    // if (/404/.test(dcmdir)) return Promise.reject('Not found');
    return Promise.resolve(vol);
  }

  /**
   * Buffer data: block data in dcm_voxel_dump combined format
   */
  public makeMockVol(): DicomVolume {
    const {
      width = 512,
      height = 512,
      depth = 128,
      pixelFormat = PixelFormat.Int16 as PixelFormat,
      vx = 0.5,
      vy = 0.5,
      vz = 0.5
    } = this.config;
    const raw = new DicomVolume([width, height, depth], pixelFormat);
    raw.setVoxelSize([vx, vy, vz]);
    let val: number;
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (pixelFormat === PixelFormat.Binary) {
            val =
              (Math.floor(x * 0.02) +
                Math.floor(y * 0.02) +
                Math.floor(z * 0.02)) %
              2;
          } else {
            val =
              ((Math.floor(x * 0.02) +
                Math.floor(y * 0.02) +
                Math.floor(z * 0.02)) %
                3) *
              30;
          }
          raw.writePixelAt(val, x, y, z);
        }
      }
      raw.markSliceAsLoaded(z);
    }
    raw.estimatedWindow = { level: 10, width: 100 };
    return raw;
  }
}
