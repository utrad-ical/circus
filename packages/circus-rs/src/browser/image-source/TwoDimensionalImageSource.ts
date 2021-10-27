import DicomVolume from '../../common/DicomVolume';
import { Vector2D, Vector3D } from '../../common/geometry';
import {
  adjustOnResized,
  asSectionInDrawingViewState,
  convertSectionToTwoDimensionalState,
  createOrthogonalMprSection
} from '../section-util';
import setImmediate from '../util/setImmediate';
import Viewer from '../viewer/Viewer';
import ViewState, { TwoDimensionalViewState } from '../ViewState';
import ImageDataCache from './cache/ImageDataCache';
import drawToImageData, {
  drawToImageDataWithApplyWindow
} from './drawToImageData';
import ImageSource, { ViewStateResizeTransformer } from './ImageSource';
import DicomVolumeLoader, {
  DicomVolumeMetadata
} from './volume-loader/DicomVolumeLoader';

// HACK: Support-2d-image-source
interface TwoDimensionalImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
  maxCacheSize?: number;
}

export default class TwoDimensionalImageSource extends ImageSource {
  public metadata: DicomVolumeMetadata | undefined;
  protected loadSequence: Promise<void> | undefined;
  private volume: DicomVolume | undefined;
  private cache: ImageDataCache;

  constructor({
    volumeLoader,
    maxCacheSize
  }: TwoDimensionalImageSourceOptions) {
    super();
    this.loadSequence = (async () => {
      this.metadata = await volumeLoader.loadMeta();
      this.volume = await volumeLoader.loadVolume();
    })();
    this.cache = new ImageDataCache({ maxSize: maxCacheSize });
  }

  public initialState(viewer: Viewer): ViewState {
    if (!this.metadata) throw new Error('Metadata not loaded');
    const metadata = this.metadata;
    const window = metadata.dicomWindow
      ? { ...metadata.dicomWindow }
      : metadata.estimatedWindow
      ? { ...metadata.estimatedWindow }
      : { level: 50, width: 100 };

    // Create initial section as axial MPR section watched from head to toe.
    const sectionDummy = createOrthogonalMprSection(
      viewer.getResolution(),
      this.mmDim(),
      'axial',
      0
    );

    const state = {
      type: '2d',
      window,
      ...convertSectionToTwoDimensionalState(sectionDummy)
    } as TwoDimensionalViewState;

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

  public async draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    if (viewState.type !== '2d') throw new Error('Unsupported view state');

    const context = viewer.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');

    const cacheKey = this.createKey(viewState);
    let cachedImageData: ImageData | undefined;
    cachedImageData = await this.cache.getImage(cacheKey);
    if (!cachedImageData) {
      cachedImageData = this.createCacheImageData(viewer, viewState);
      await this.cache.putImage(cacheKey, cachedImageData);
    }

    const interpolationMode = viewState.interpolationMode;
    const imageSmoothingEnabled = !(
      !interpolationMode || interpolationMode === 'none'
    );
    context.imageSmoothingEnabled = imageSmoothingEnabled;
    context.imageSmoothingQuality = 'medium';

    const imageData = this.createClippedImageData(
      viewer,
      viewState,
      cachedImageData
    );

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    // Cf. http://stackoverflow.com/q/27647742/1209240
    return new Promise(resolve => {
      setImmediate(() => resolve(imageData!));
    });
  }

  private createKey(state: TwoDimensionalViewState): string {
    const { imageNumber, window } = state;
    let key: string = 'imageNumber:' + imageNumber + ';';
    if (window) key += 'ww:' + window.width + ';' + 'wl:' + window.level + ';';
    return key;
  }

  private createCacheImageData(
    viewer: Viewer,
    viewState: TwoDimensionalViewState
  ): ImageData {
    const metadata = this.metadata!;
    const volume = this.volume!;
    const context = viewer.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');

    const src = volume.getSingleImage(viewState.imageNumber);
    const [w, h] = metadata.voxelCount;

    const buffer = new Uint8ClampedArray(src);
    if (metadata.pixelFormat === 'rgba8') {
      // RGBA
      return new ImageData(buffer, w, h);
    } else if (!!viewState.window) {
      // Monochrome (apply window)
      const ww = viewState.window.width;
      const wl = viewState.window.width;
      return drawToImageDataWithApplyWindow(viewer, [w, h], buffer, ww, wl);
    } else {
      // Monochrome
      return drawToImageData(viewer, [w, h], buffer);
    }
  }

  private createClippedImageData(
    viewer: Viewer,
    viewState: TwoDimensionalViewState,
    cachedImageData: ImageData
  ): ImageData {
    // HACK: Support-2d-image-source
    // TODO: doramari

    //                                           Backcanvas (内部的に一度別のキャンバスに描画, Interpolation が効く! putImageData ?? 位置、引き伸ばし)
    //                                           ^^^^^^^^^^^ WebGL MPR ImageSource
    return cachedImageData;
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
      if (viewState.type !== '2d') {
        return viewState;
      }

      const section = asSectionInDrawingViewState(viewState);

      const resizedSection = adjustOnResized(section, beforeSize, afterSize);

      if (section === resizedSection) {
        return viewState;
      }

      return {
        ...viewState,
        ...convertSectionToTwoDimensionalState(resizedSection)
      } as TwoDimensionalViewState;
    };
  }
}
