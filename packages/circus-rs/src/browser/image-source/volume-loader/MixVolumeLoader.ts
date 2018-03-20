import DicomVolumeLoader from './DicomVolumeLoader';
import DicomVolume from '../../../common/DicomVolume';
import { PixelFormat } from '../../../common/PixelFormat';
import { DicomVolumeMetadata } from './DicomVolumeLoader';

/**
 * MixVolumeLoader takes two volume loaders and asynchronouslly produces
 * one duplex volume.
 */
export default class MixVolumeLoader implements DicomVolumeLoader {
  private volumeLoader: DicomVolumeLoader;
  private maskLoader: DicomVolumeLoader;
  private meta: DicomVolumeMetadata;

  constructor({ volumeLoader, maskLoader }) {
    this.volumeLoader = volumeLoader;
    this.maskLoader = maskLoader;
  }

  public async loadMeta(): Promise<DicomVolumeMetadata> {
    const meta = await this.volumeLoader.loadMeta();
    this.meta = meta;
    return meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    const [baseVolume, maskVolume] = await Promise.all([
      this.volumeLoader.loadVolume(),
      this.maskLoader.loadVolume()
    ]);
    const meta = this.meta;
    const [width, height, depth] = meta.voxelCount;
    const pixelFormat = meta.pixelFormat as PixelFormat;

    const volume = new DicomVolume([width, height, depth], pixelFormat);
    volume.setVoxelSize(meta.voxelSize);
    if (meta.estimatedWindow)
      volume.estimatedWindow = { ...meta.estimatedWindow };

    volume.fillAll((x, y, z) => {
      const val = baseVolume.getPixelAt(x, y, z);
      const mask = maskVolume.getPixelAt(x, y, z);

      switch (mask) {
        case 1:
          return Math.min(val, 32767);
        case 2:
          return Math.min(val, 32767) + 32768;
        default:
          return 0;
      }
    });

    for (let z = 0; z < depth; z++) {
      volume.markSliceAsLoaded(z);
    }

    return volume;
  }
}
