import DicomVolumeLoader, { DicomMetadata } from './DicomVolumeLoader';
import { PixelFormat } from '../..';
import DicomVolume from '../../../common/DicomVolume';

interface MockVolumeLoaderOptions {
  meta?: DicomMetadata;
  gridSize?: number;
}

/**
 * MockLoader asynchronously produces a mock volume with a 3D grid.
 */
export default class MockLoader implements DicomVolumeLoader {
  private option: MockVolumeLoaderOptions;
  private meta: DicomMetadata;

  constructor(option: MockVolumeLoaderOptions = {}) {
    this.option = option;

    const meta: DicomMetadata = option.meta || {
      voxelSize: [0.4688, 0.4688, 0.6],
      voxelCount: [512, 512, 132],
      estimatedWindow: { level: 200, width: 600 },
      dicomWindow: { level: 200, width: 600 },
      pixelFormat: PixelFormat.UInt16
    };

    this.meta = meta;
  }

  public async loadMeta(): Promise<DicomMetadata> {
    return this.meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    const option = this.option;

    const meta = this.meta;
    const gridSize = option.gridSize || 50;

    const [width, height, depth] = meta.voxelCount;
    const pixelFormat = meta.pixelFormat as PixelFormat;

    const volume = new DicomVolume([width, height, depth], pixelFormat);
    volume.setVoxelSize(meta.voxelSize);
    if (meta.estimatedWindow)
      volume.estimatedWindow = { ...meta.estimatedWindow };

    const createValue = (x, y, z) => {
      let val =
        Math.floor(x / gridSize) +
        Math.floor(y / gridSize) +
        Math.floor(z / gridSize);
      if (pixelFormat === PixelFormat.Binary) {
        val %= 2;
      } else {
        val = (val % 3) * 30;
      }
      return val;
    };

    volume.fillAll(createValue);

    for (let z = 0; z < depth; z++) {
      volume.markSliceAsLoaded(z);
    }

    return volume;
  }
}
