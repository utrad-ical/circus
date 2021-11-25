import DicomVolume from '../../common/DicomVolume';
import { Vector2D, Vector3D } from '../../common/geometry';
import {
  adjustOnResized,
  sectionTo2dViewState,
  sectionFrom2dViewState,
  createOrthogonalMprSection
} from '../section-util';
import setImmediate from '../util/setImmediate';
import Viewer from '../viewer/Viewer';
import ViewState, { TwoDimensionalViewState } from '../ViewState';
import { drawToImageDataFor2D } from './drawToImageData';
import ImageSource, { ViewStateResizeTransformer } from './ImageSource';
import DicomVolumeLoader, {
  DicomVolumeMetadata
} from './volume-loader/DicomVolumeLoader';

interface TwoDimensionalImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
  maxCacheSize?: number;
}

export default class TwoDimensionalImageSource extends ImageSource {
  public metadata: DicomVolumeMetadata | undefined;
  protected loadSequence: Promise<void> | undefined;
  private volume: DicomVolume | undefined;
  private cache: UnclippedImageBitmapCache;
  private backCanvas: HTMLCanvasElement;

  constructor({
    volumeLoader,
    maxCacheSize = 10
  }: TwoDimensionalImageSourceOptions) {
    super();
    this.loadSequence = (async () => {
      this.metadata = await volumeLoader.loadMeta();
      this.volume = await volumeLoader.loadVolume();
    })();
    this.cache = new UnclippedImageBitmapCache({ maxSize: maxCacheSize });

    const backCanvas = this.initializeBackCanvas();
    this.backCanvas = backCanvas;
  }

  private initializeBackCanvas() {
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 1;
    backCanvas.height = 1;
    backCanvas.style.visibility = 'hidden';
    return backCanvas;
  }

  public initialState(viewer: Viewer): ViewState {
    if (!this.metadata) throw new Error('Metadata not loaded');
    const metadata = this.metadata;

    const window =
      metadata.pixelFormat === 'rgba8'
        ? undefined
        : metadata.dicomWindow
          ? { ...metadata.dicomWindow }
          : metadata.estimatedWindow
            ? { ...metadata.estimatedWindow }
            : { level: 50, width: 100 };

    const initialState: TwoDimensionalViewState = {
      type: '2d',
      origin: [0, 0],
      xAxis: [metadata.voxelCount[0], 0],
      yLength: metadata.voxelCount[1],
      imageNumber: 0,
      window
    };

    // Create initial section as axial MPR section watched from head to toe.
    const sectionDummy = createOrthogonalMprSection(
      viewer.getResolution(),
      this.mmDim(),
      'axial',
      0
    );

    const state = sectionTo2dViewState(initialState, sectionDummy);
    return state;
  }

  public async ready(): Promise<void> {
    await this.loadSequence;
  }

  /**
   * Calculates the source volume size in millimeters.
   */
  public mmDim(): Vector3D {
    if (!this.metadata) throw new Error('Metadata not loaded');
    const voxelCount = this.metadata.voxelCount;
    const voxelSize = this.metadata.voxelSize;
    return [
      voxelCount[0] * voxelSize[0],
      voxelCount[1] * voxelSize[1],
      voxelCount[2] * voxelSize[2]
    ];
  }

  private async createUnclippedImageBitmap(
    viewState: TwoDimensionalViewState
  ): Promise<ImageBitmap> {
    const imageData = this.createImageData(viewState);
    const imageBitmap = await createImageBitmap(imageData);
    return imageBitmap;
  }

  public async draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    if (viewState.type !== '2d') throw new Error('Unsupported view state');

    const context = viewer.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');

    const { imageNumber, window, interpolationMode } = viewState;

    const cacheKey =
      `imageNumber:${imageNumber};` +
      (window ? `ww:${window.width};wl${window.level};` : '');

    const imageBitmap = await this.cache.get(cacheKey) ??
      await this.cache.set(
        cacheKey,
        this.createUnclippedImageBitmap(viewState)
      );

    const imageSmoothingEnabled = !(
      !interpolationMode || interpolationMode === 'none'
    );
    context.imageSmoothingEnabled = imageSmoothingEnabled;
    context.imageSmoothingQuality = 'medium';

    const imageData = this.createClippedImageData(
      viewer,
      viewState,
      imageBitmap
    );

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    // Cf. http://stackoverflow.com/q/27647742/1209240
    return new Promise(resolve => {
      setImmediate(() => resolve(imageData!));
    });
  }

  private createImageData(viewState: TwoDimensionalViewState): ImageData {
    const metadata = this.metadata!;
    const volume = this.volume!;

    const [w, h] = metadata.voxelCount;
    const { imageNumber, window } = viewState;
    const overlap = 0 <= imageNumber && imageNumber < metadata.voxelCount[2];
    if (!overlap) return new ImageData(w, h);

    const src = volume.getSingleImage(imageNumber);

    if (metadata.pixelFormat === 'rgba8') {
      // RGBA
      const buffer = new Uint8ClampedArray(src);
      return new ImageData(buffer, w, h);
    } else {
      // Monochrome
      const pxInfo = volume.getPixelFormatInfo();
      const buffer = new pxInfo.arrayClass(src);
      return drawToImageDataFor2D([w, h], buffer, window);
    }
  }

  private async createClippedImageData(
    viewer: Viewer,
    viewState: TwoDimensionalViewState,
    image: CanvasImageSource
  ): Promise<ImageData> {
    const outSize = viewer.getResolution();
    this.backCanvas.width = outSize[0];
    this.backCanvas.height = outSize[1];

    const backContext = this.backCanvas.getContext('2d');
    if (!backContext) throw new Error('Failed to get backCanvas context');

    const { origin, xAxis, yLength } = viewState;
    if (xAxis[1] !== 0) throw new Error('Rotation is not supported yet.');

    const sx = origin[0];
    const sy = origin[1];
    const sw = xAxis[0];
    const sh = yLength;
    const dx = 0;
    const dy = 0;
    const dw = outSize[0];
    const dh = outSize[1];

    backContext.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    const clippedImageData = backContext.getImageData(dx, dy, dw, dh);
    return clippedImageData;
  }

  /**
   * Produce helper of change state on resizing viewer.
   */
  public getResizeTransformer(): ViewStateResizeTransformer {
    return (
      viewState: ViewState,
      beforeSize: Vector2D,
      afterSize: Vector2D
    ): ViewState => {
      if (viewState.type !== '2d') return viewState;

      const section = sectionFrom2dViewState(viewState);
      const resizedSection = adjustOnResized(section, beforeSize, afterSize);
      if (section === resizedSection) {
        return viewState;
      }
      return sectionTo2dViewState(viewState, resizedSection);
    };
  }
}

interface UnclippedImageBitmapCacheOption {
  maxSize: number;
}
class UnclippedImageBitmapCache {
  private data: Map<string, Promise<ImageBitmap>>;
  private maxSize: number;
  private lruIndex: string[];

  constructor({ maxSize }: UnclippedImageBitmapCacheOption) {
    this.data = new Map();
    this.maxSize = maxSize;
    this.lruIndex = [];
  }

  public get(key: string): Promise<ImageBitmap | undefined> {
    if (this.data.has(key)) {
      const value = this.data.get(key)!;
      this.lruIndex = this.lruIndex.filter(v => v !== key).concat([key]);
      return value;
    }
    return Promise.resolve(undefined);
  }

  public set(key: string, value: Promise<ImageBitmap>): Promise<ImageBitmap> {
    this.lruIndex.push(key);
    if (this.maxSize < this.lruIndex.length) {
      const deleteCacheKey = this.lruIndex.shift()!;
      this.data.delete(deleteCacheKey);
    }
    return value;
  }
}
