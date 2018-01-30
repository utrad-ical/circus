import DicomVolume from '../../common/DicomVolume';
import { PixelFormat } from '../../common/PixelFormat';
import {
  VolumeImageSource,
  DicomMetadata
} from '../../browser/image-source/volume-image-source';
import { ViewState } from '../view-state';
import { convertSectionToIndex } from '../section-util';
import { Vector2D, Section } from '../../common/geometry';
import setImmediate from '../util/set-immediate';

export class MockImageSource extends VolumeImageSource {
  private volume: DicomVolume;

  constructor(meta: DicomMetadata) {
    super();
    this.meta = meta;
    this.meta.estimatedWindow = { level: 10, width: 100 };
    this.meta.dicomWindow = { level: 10, width: 100 };
    this.meta.voxelSize = meta.voxelSize || [0.5, 0.5, 0.5];
    this.meta.voxelCount = meta.voxelCount || [512, 512, 478];
    this.meta.pixelFormat = meta.pixelFormat || PixelFormat.Int16;
    this.volume = this.createMockVolume(meta);
  }

  /**
   * Prepares checkerboard volume image
   */
  private createMockVolume(meta: DicomMetadata): DicomVolume {
    const [width, height, depth] = meta.voxelCount;
    const pixelFormat = meta.pixelFormat as PixelFormat;
    const [wl, ww] = [meta.estimatedWindow.level, meta.estimatedWindow.width];

    const raw = new DicomVolume(meta.voxelCount, pixelFormat);

    const createValue = (x, y, z) => {
      const gridSize = 50;
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

    raw.setVoxelSize(meta.voxelSize);
    raw.estimatedWindow = { level: wl, width: ww };
    raw.fillAll(createValue);

    for (let z = 0; z < depth; z++) {
      raw.markSliceAsLoaded(z);
    }

    return raw;
  }

  protected scan(viewState: ViewState, outSize: Vector2D): Promise<Uint8Array> {
    const imageBuffer = new Uint8Array(outSize[0] * outSize[1]);

    // convert from mm-coordinate to index-coordinate
    const mmSection = viewState.section;
    const viewWindow = viewState.window;
    if (!mmSection || !viewWindow) throw new Error('Unsupported view state.');

    const indexSection: Section = convertSectionToIndex(
      mmSection,
      this.voxelSize()
    );

    this.volume.scanObliqueSection(
      indexSection,
      outSize,
      imageBuffer,
      viewState.interpolationMode === 'trilinear',
      viewWindow.width,
      viewWindow.level
    );

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    return new Promise(resolve => {
      setImmediate(() => resolve(imageBuffer));
    });
  }
}
