import Viewer from '../viewer/Viewer';
import ViewState, { MprViewState } from '../ViewState';
import DicomVolume from '../../common/DicomVolume';
import { DicomVolumeProgressiveLoader } from './volume-loader/DicomVolumeLoader';
import MprProgram from './gl/MprProgram';
import MprImageSource from './MprImageSource';
import {
  createCameraToLookSection,
  getWebGLContext,
  resolveImageData
} from './gl/webgl-util';
import MprImageSourceWithDicomVolume from './MprImageSourceWithDicomVolume';
import MultiRange, { Initializer as MultiRangeInitializer } from 'multi-integer-range';
import { DrawResult } from './ImageSource';
import setImmediate from '../util/setImmediate';
import getRequiredImageZIndexRange from 'browser/util/getRequiredImageZIndexRange';

export interface WebGlRawVolumeMprImageSourceOptions {
  volumeLoader: DicomVolumeProgressiveLoader;
  // Specify the interval of updating draft image in ms.
  // If zero is specified, do not return a draft image.
  // Default value is 300 [ms]
  draftInterval?: number;
}
type RGBA = [number, number, number, number];

/**
 * For debugging
 */
const debugMode = 0;
type CaptureCanvasCallback = (canvas: HTMLCanvasElement) => void;

export default class WebGlRawVolumeMprImageSource
  extends MprImageSource
  implements MprImageSourceWithDicomVolume {
  private volume: DicomVolume | undefined;
  private fullyLoaded: boolean = false;
  private draftInterval: number = 0;

  private backCanvas: HTMLCanvasElement;
  private glContext: WebGLRenderingContext;

  private mprProgram: MprProgram;

  private background: RGBA = [0.0, 0.0, 0.0, 1.0];

  private setPriority: (imageIndices: MultiRangeInitializer, priority: number) => void = () => { };

  // For debugging
  public static captureCanvasCallbacks: CaptureCanvasCallback[] = [];
  public static captureCanvasElement(
    captureCanvasCallback: CaptureCanvasCallback
  ) {
    WebGlRawVolumeMprImageSource.captureCanvasCallbacks.push(
      captureCanvasCallback
    );
  }

  constructor({ volumeLoader, draftInterval }: WebGlRawVolumeMprImageSourceOptions) {
    super();

    draftInterval = draftInterval || 200;

    const backCanvas = this.createBackCanvas();
    const glContext = getWebGLContext(backCanvas);
    glContext.clearDepth(1.0);
    const mprProgram = new MprProgram(glContext);

    this.backCanvas = backCanvas;
    this.glContext = glContext;
    this.mprProgram = mprProgram;

    // For debugging
    WebGlRawVolumeMprImageSource.captureCanvasCallbacks.forEach(handler =>
      handler(backCanvas)
    );

    this.loadSequence = (async () => {
      this.draftInterval = draftInterval;
      this.metadata = await volumeLoader.loadMeta();
      this.volume = volumeLoader.getVolume()!;
      if (volumeLoader.setPriority) this.setPriority = volumeLoader.setPriority.bind(volumeLoader);

      // Assign the length of the longest side of the volume to
      // the length of the side in normalized device coordinates.
      const { voxelSize, voxelCount } = this.metadata!;
      const longestSideLengthInMmOfTheVolume = Math.max(
        voxelCount[0] * voxelSize[0],
        voxelCount[1] * voxelSize[1],
        voxelCount[2] * voxelSize[2]
      );
      mprProgram.setMmInNdc(1.0 / longestSideLengthInMmOfTheVolume);
      mprProgram.activate();
      const { transfer } = mprProgram.setDicomVolume(this.volume);

      volumeLoader.on('progress', async ({ imageIndex }) => {
        await transfer(imageIndex);
      });

      volumeLoader.loadVolume().then(() => this.fullyLoaded = true);
      if (!draftInterval) await volumeLoader.loadVolume();
    })();
  }

  public getLoadedDicomVolume() {
    return this.volume;
  }

  /**
   * @todo Implements webglcontextlost/webglcontextrestored
   */
  private createBackCanvas() {
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 1;
    backCanvas.height = 1;

    // backCanvas.addEventListener('webglcontextlost', _ev => {}, false);
    // backCanvas.addEventListener('webglcontextrestored', _ev => {}, false);

    return backCanvas;
  }

  private updateViewportSize([width, height]: [number, number]) {
    if (this.backCanvas.width !== width || this.backCanvas.height !== height) {
      this.backCanvas.width = width;
      this.backCanvas.height = height;
      this.glContext.viewport(0, 0, width, height);
    }
  }

  /**
   * Performs the main rendering.
   * @param viewer
   * @param viewState
   * @returns {Promise<ImageData>}
   */
  public async draw(viewer: Viewer, viewState: ViewState, abortSignal: AbortSignal): Promise<DrawResult> {

    if (viewState.type !== 'mpr') throw new TypeError('Unsupported state');

    const [min, max] = getRequiredImageZIndexRange(viewState.section, this.metadata!)
    const images = new MultiRange([[min, max]]);
    const priority = this.metadata!.voxelCount[2] / images.length();
    this.setPriority(images, priority);

    const drawResult = this.createDrawResult(viewer, viewState, abortSignal);

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    // Cf. http://stackoverflow.com/q/27647742/1209240
    return new Promise(resolve => {
      setImmediate(() => resolve(drawResult!));
    });
  }

  private async createDrawResult(viewer: Viewer, viewState: MprViewState, abortSignal: AbortSignal): Promise<DrawResult> {
    const imageData = await this.createImageData(viewer, viewState, abortSignal);

    return this.fullyLoaded
      ? imageData
      : {
        draft: imageData,
        next: async () => {
          await new Promise<void>((resolve) => setTimeout(() => resolve(), this.draftInterval));
          return await this.createDrawResult(viewer, viewState, abortSignal);
        }
      };
  }

  private async createImageData(viewer: Viewer, viewState: ViewState, abortSignal: AbortSignal): Promise<ImageData> {
    if (viewState.type !== 'mpr') throw new Error('Unsupported view state.');

    if (!this.mprProgram.isActive())
      throw new Error('The program is not active');

    // Adjust viewport
    this.updateViewportSize(viewer.getResolution());

    this.glContext.clearColor(...this.background);
    this.glContext.clear(
      this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT
    );

    // Camera
    const camera = createCameraToLookSection(
      viewState.section,
      this.metadata!.voxelCount,
      this.metadata!.voxelSize
    );

    this.mprProgram.setCamera(camera);

    this.mprProgram.setInterporationMode(viewState.interpolationMode);
    this.mprProgram.setViewWindow(viewState.window);

    this.mprProgram.setSection(viewState.section);
    this.mprProgram.setBackground(this.background);

    this.mprProgram.setDebugMode(debugMode);

    this.mprProgram.run();

    return resolveImageData(this.glContext);
  }
}
