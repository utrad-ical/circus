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
import drawToImageData from './drawToImageData';
import ImageSource, {
  DrawResult,
  ViewStateResizeTransformer
} from './ImageSource';
import DicomVolumeLoader, {
  DicomVolumeMetadata,
  VolumeLoadController
} from './volume-loader/DicomVolumeLoader';

interface TwoDimensionalImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
  maxCacheSize?: number;
}

export default class TwoDimensionalImageSource extends ImageSource {
  public metadata: DicomVolumeMetadata | undefined;
  protected loadSequence: Promise<void> | undefined;
  private volume: DicomVolume | undefined;
  private cache: LRU<Promise<ImageBitmap>>;
  private backCanvas: HTMLCanvasElement;

  private loadController: VolumeLoadController;
  private higherPriority: number = 0;
  private draftInterval: number = 300;

  constructor({
    volumeLoader,
    maxCacheSize = 10
  }: TwoDimensionalImageSourceOptions) {
    super();

    if (!volumeLoader.loadController) {
      throw new TypeError(
        'The specified volumeLoader does not have loadController.'
      );
    }

    this.loadController = volumeLoader.loadController;

    this.loadSequence = (async () => {
      this.metadata = await volumeLoader.loadMeta();
      this.volume = volumeLoader.loadController!.getVolume()!;
      volumeLoader.loadVolume();
    })();
    this.cache = new LRU({ maxSize: maxCacheSize });

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

  public async draw(
    viewer: Viewer,
    viewState: ViewState,
    abortSignal: AbortSignal
  ): Promise<DrawResult> {
    if (viewState.type !== '2d') throw new Error('Unsupported view state');

    const { imageNumber } = viewState;
    this.loadController.setPriority(imageNumber, ++this.higherPriority);

    const drawResult = await this.createDrawResult(
      viewer,
      viewState,
      abortSignal
    );

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    // Cf. http://stackoverflow.com/q/27647742/1209240
    return new Promise(resolve => {
      setImmediate(() => resolve(drawResult));
    });
  }

  private async createDrawResult(
    viewer: Viewer,
    viewState: TwoDimensionalViewState,
    abortSignal: AbortSignal
  ): Promise<DrawResult> {
    const { imageNumber } = viewState;

    if (this.loadController.loadedImages().some(i => i === imageNumber)) {
      return await this.createImageResult(viewer, viewState, abortSignal);
    } else {
      return {
        draft: this.createEmptyData(),
        next: async () => {
          await new Promise<void>(resolve =>
            setTimeout(() => resolve(), this.draftInterval)
          );
          return await this.createDrawResult(viewer, viewState, abortSignal);
        }
      };
    }
  }

  private async createImageResult(
    viewer: Viewer,
    viewState: TwoDimensionalViewState,
    abortSignal: AbortSignal
  ): Promise<DrawResult> {
    const context = viewer.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');

    const { imageNumber, window, interpolationMode = 'none' } = viewState;

    const cacheKey =
      `imageNumber:${imageNumber};` +
      (window ? `ww:${window.width};wl${window.level};` : '');

    let bitmapPromise: Promise<ImageBitmap> | undefined =
      this.cache.get(cacheKey);
    if (!bitmapPromise) {
      const imageData = this.createImageData(viewState);
      bitmapPromise = createImageBitmap(imageData);
      this.cache.set(cacheKey, bitmapPromise);
    }

    const bitmap = await bitmapPromise;

    const imageSmoothingEnabled = !(
      !interpolationMode || interpolationMode === 'none'
    );
    context.imageSmoothingEnabled = imageSmoothingEnabled;
    context.imageSmoothingQuality = 'medium';

    const imageData = this.createClippedImageData(viewer, viewState, bitmap);

    return imageData;
  }

  private createEmptyData(): ImageData {
    const metadata = this.metadata!;
    const [w, h] = metadata.voxelCount;
    return new ImageData(w, h);
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
      const buffer = new Uint8ClampedArray(src);
      return new ImageData(buffer, w, h);
    } else {
      const pxInfo = volume.getPixelFormatInfo();
      const buffer = new pxInfo.arrayClass(src);
      return drawToImageData([w, h], buffer, window);
    }
  }

  private createClippedImageData(
    viewer: Viewer,
    viewState: TwoDimensionalViewState,
    image: ImageBitmap
  ): ImageData {
    const outSize = viewer.getResolution();
    const pixelSpacing = this.metadata?.voxelSize ?? [1, 1, 1];
    this.backCanvas.width = outSize[0];
    this.backCanvas.height = outSize[1];

    const backContext = this.backCanvas.getContext('2d');
    if (!backContext) throw new Error('Failed to get backCanvas context');

    const { origin, xAxis, yLength } = viewState;
    if (xAxis[1] !== 0) throw new Error('Rotation is not supported yet.');

    const sx = origin[0];
    const sy = origin[1];
    const sw = xAxis[0] / pixelSpacing[0];
    const sh = yLength / pixelSpacing[1];
    const dx = 0;
    const dy = 0;
    const dw = outSize[0];
    const dh = outSize[1];

    backContext.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    const clippedImageData = backContext.getImageData(dx, dy, dw, dh);
    return clippedImageData;
  }

  /**
   * Produce helper to change state on resizing viewer.
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

interface LRUOptions {
  maxSize: number;
}

class LRU<T> {
  private data: Map<string, T>;
  private maxSize: number;

  constructor({ maxSize }: LRUOptions) {
    this.data = new Map();
    this.maxSize = maxSize;
  }

  public has(key: string): boolean {
    return this.data.has(key);
  }

  public get(key: string): T | undefined {
    if (this.data.has(key)) {
      const value = this.data.get(key)!;
      // peek the entry, re-insert for LRU strategy
      this.data.delete(key);
      this.data.set(key, value);
      return value;
    }
    return undefined;
  }

  public set(key: string, value: T): T {
    this.data.set(key, value);
    if (this.maxSize < this.data.size) {
      // least-recently used cache eviction strategy
      const deleteCacheKey = this.data.keys().next().value;
      this.data.delete(deleteCacheKey);
    }
    return value;
  }
}
