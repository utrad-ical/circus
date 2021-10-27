import { Vector3 } from 'three';
import DicomVolume from '../../common/DicomVolume';
import { Section, Vector2D, Vector3D } from '../../common/geometry';
import {
  adjustOnResized,
  asSectionInDrawingViewState,
  convertSectionToIndex,
  convertSectionToTwoDimensionalState,
  createOrthogonalMprSection
} from '../section-util';
import setImmediate from '../util/setImmediate';
import Viewer from '../viewer/Viewer';
import ViewState, { TwoDimensionalViewState } from '../ViewState';
import ImageDataCache from './cache/ImageDataCache';
import drawRgba8ToImageData from './drawRgba8ToImageData';
import drawToImageData from './drawToImageData';
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

    // HACK: Support-2d-image-source
    const cacheKey = this.createKey(viewState);
    let imageData: ImageData | undefined;
    imageData = await this.cache.getImage(cacheKey);
    if (!imageData) {
      imageData =
        this.metadata!.pixelFormat === 'rgba8'
          ? this.createImageDataOfRGBA8(viewer, viewState)
          : this.createImageDataOfMonochrome(viewer, viewState);
      await this.cache.putImage(cacheKey, imageData);
    }

    // HACK: Support-2d-image-source
    const interpolationMode = viewState.interpolationMode;
    const imageSmoothingEnabled = !(
      !interpolationMode || interpolationMode === 'none'
    );
    context.imageSmoothingEnabled = imageSmoothingEnabled;
    context.imageSmoothingQuality = 'medium';

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    // Cf. http://stackoverflow.com/q/27647742/1209240
    return new Promise(resolve => {
      setImmediate(() => resolve(imageData!));
    });
  }

  private createKey(state: TwoDimensionalViewState): string {
    const { imageNumber, window, origin, xAxis, yLength } = state;
    let key: string = 'imageNumber:' + imageNumber + ';';
    if (window) key += 'ww:' + window.width + ';' + 'wl:' + window.level + ';';
    key += 'origin:' + origin.join(',') + ';';
    key += 'xAxis:' + xAxis.join(',') + ';';
    key += 'yLength:' + yLength + ';';
    return key;
  }

  private createImageDataOfRGBA8(
    viewer: Viewer,
    viewState: TwoDimensionalViewState
  ): ImageData {
    // HACK: Support-2d-image-source
    const metadata = this.metadata!;
    const outSize = viewer.getResolution();
    const volume = this.volume!;
    const outImage = new Uint32Array(outSize[0] * outSize[1]);
    const viewWindow = {
      width: undefined,
      level: undefined
    };

    const indexSection: Section = convertSectionToIndex(
      asSectionInDrawingViewState(viewState),
      new Vector3().fromArray(metadata.voxelSize)
    );

    volume.scanSection2D(
      convertSectionToTwoDimensionalState(indexSection),
      outSize,
      outImage,
      viewWindow.width,
      viewWindow.level
    );

    const imageData = drawRgba8ToImageData(viewer, outSize, outImage);
    return imageData;
  }

  private createImageDataOfMonochrome(
    viewer: Viewer,
    viewState: TwoDimensionalViewState
  ): ImageData {
    // HACK: Support-2d-image-source
    const metadata = this.metadata!;
    const outSize = viewer.getResolution();
    const volume = this.volume!;
    const outImage = new Uint8Array(outSize[0] * outSize[1]);
    const viewWindow = viewState.window ?? {
      width: undefined,
      level: undefined
    };

    const indexSection: Section = convertSectionToIndex(
      asSectionInDrawingViewState(viewState),
      new Vector3().fromArray(metadata.voxelSize)
    );

    volume.scanSection2D(
      convertSectionToTwoDimensionalState(indexSection),
      outSize,
      outImage,
      viewWindow.width,
      viewWindow.level
    );

    const imageData = drawToImageData(viewer, outSize, outImage);
    return imageData;
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
