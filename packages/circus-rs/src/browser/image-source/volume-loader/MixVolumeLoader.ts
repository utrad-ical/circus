import DicomVolumeLoader from './DicomVolumeLoader';
import DicomVolume from '../../../common/DicomVolume';
import { PixelFormat } from '@utrad-ical/circus-lib/src/PixelFormat';
import { DicomVolumeMetadata } from './DicomVolumeLoader';

interface MixVolumeLoaderOptions {
  mainLoader: DicomVolumeLoader;
  maskLoader: DicomVolumeLoader;
}

/**
 * MixVolumeLoader takes two volume loaders and asynchronouslly produces
 * one duplex volume.
 */
export default class MixVolumeLoader implements DicomVolumeLoader {
  private mainLoader: DicomVolumeLoader;
  private maskLoader: DicomVolumeLoader;
  private meta: DicomVolumeMetadata | undefined;

  constructor({ mainLoader, maskLoader }: MixVolumeLoaderOptions) {
    this.mainLoader = mainLoader;
    this.maskLoader = maskLoader;
  }

  public async loadMeta(): Promise<DicomVolumeMetadata> {
    const meta = await this.mainLoader.loadMeta();
    this.meta = meta;
    return meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    if (!this.meta) throw new Error('Medatada not loaded yet');

    const [baseVolume, maskVolume] = await Promise.all([
      this.mainLoader.loadVolume(),
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
