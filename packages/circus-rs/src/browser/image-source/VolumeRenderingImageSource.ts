import Viewer from '../viewer/Viewer';
import ViewState, { VrViewState, TransferFunction } from '../ViewState';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';
import VRGLProgram from './gl/VRGLProgram';
import RawData from '../../common/RawData';
import { LabelLoader } from './volume-loader/interface';
import { windowToTransferFunction } from './gl/transfer-function-util';
import MprImageSource from './MprImageSource';
import { createOrthogonalMprSection } from '../section-util';
import {
  createCameraToLookSection,
  getWebGLContext,
  resolveImageData
} from './gl/webgl-util';
import DicomVolume from 'common/DicomVolume';

interface VolumeRenderingImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
  maskLoader?: VolumeLoader;
  labelLoader?: LabelLoader;
}

interface VolumeLoader {
  loadVolume(): Promise<RawData>;
}

type RGBA = [number, number, number, number];

/**
 * For debugging
 */
const debugMode = 0;
type CaptureCanvasCallback = (canvas: HTMLCanvasElement) => void;

export default class VolumeRenderingImageSource extends MprImageSource {
  private volume: DicomVolume | undefined;
  private mask: RawData | undefined;

  private backCanvas: HTMLCanvasElement;
  private glContext: WebGLRenderingContext;

  private vrProgram: VRGLProgram;
  private labelLoader?: LabelLoader;
  private loadingLabelData: Record<number, Promise<void>> = {};

  // Cache for checking update something.
  private lastTransferFunction?: TransferFunction;
  private background: RGBA = [0.0, 0.0, 0.0, 0.0];

  // For debugging
  public static captureCanvasCallbacks: CaptureCanvasCallback[] = [];
  public static captureCanvasElement(
    captureCanvasCallback: CaptureCanvasCallback
  ) {
    VolumeRenderingImageSource.captureCanvasCallbacks.push(
      captureCanvasCallback
    );
  }

  constructor({
    volumeLoader,
    maskLoader,
    labelLoader
  }: VolumeRenderingImageSourceOptions) {
    super();

    const backCanvas = this.createBackCanvas();
    const glContext = getWebGLContext(backCanvas);
    const vrProgram = new VRGLProgram(glContext);

    this.backCanvas = backCanvas;
    this.glContext = glContext;
    this.vrProgram = vrProgram;
    this.vrProgram.activate();

    // For debugging
    VolumeRenderingImageSource.captureCanvasCallbacks.forEach(handler =>
      handler(backCanvas)
    );

    this.loadSequence = (async () => {
      this.metadata = await volumeLoader.loadMeta();

      // Assign the length of the longest side of the volume to
      // the length of the side in normalized device coordinates.
      const { voxelSize, voxelCount } = this.metadata!;
      const longestSideLengthInMmOfTheVolume = Math.max(
        voxelCount[0] * voxelSize[0],
        voxelCount[1] * voxelSize[1],
        voxelCount[2] * voxelSize[2]
      );
      vrProgram.setMmInNdc(1.0 / longestSideLengthInMmOfTheVolume);

      // Load volume data and transfer as texture
      const [volume, mask] = await Promise.all([
        volumeLoader.loadVolume(),
        maskLoader ? maskLoader.loadVolume() : Promise.resolve(undefined)
      ]);

      this.volume = volume;
      this.mask = mask;

      vrProgram.setDicomVolume(volume, mask);
    })();

    this.labelLoader = labelLoader;
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

  public initialState(viewer: Viewer): ViewState {
    if (!this.metadata) throw new Error('Metadata now loaded');
    const metadata = this.metadata;
    const window = metadata.dicomWindow
      ? { ...metadata.dicomWindow }
      : metadata.estimatedWindow
      ? { ...metadata.estimatedWindow }
      : { level: 50, width: 100 };

    // Create initial section as axial section watched from head to toe.
    const section = createOrthogonalMprSection(
      viewer.getResolution(),
      this.mmDim(),
      'axial',
      undefined,
      true
    );

    const state: VrViewState = {
      type: 'vr',
      section,
      interpolationMode: 'trilinear',
      transferFunction: windowToTransferFunction(window),
      rayIntensity: 1.0,
      quality: 2.0
    };

    return state;
  }

  /**
   * Performs the main rendering.
   * @param viewer
   * @param viewState
   * @returns {Promise<ImageData>}
   */

  public async draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    if (viewState.type !== 'vr') throw new Error('Unsupported view state.');

    this.glContext.clearColor(...this.background);
    this.glContext.clearDepth(1.0);

    this.updateViewportSize(viewer.getResolution());

    this.glContext.clearColor(...this.background);
    this.glContext.clear(
      this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT
    );
    this.glContext.enable(this.glContext.DEPTH_TEST);

    // Camera
    const camera = createCameraToLookSection(
      // createCameraToLookDownXYPlane(
      viewState.section,
      this.metadata!.voxelCount,
      this.metadata!.voxelSize
    );

    const { voxelCount, voxelSize } = this.metadata!;

    const {
      interpolationMode = 'nearestNeighbor',
      highlightedLabelIndex = -1,
      rayIntensity = 1.0,
      quality = 2.0,
      subVolume,
      background
    } = viewState;

    // At the first label highlighting, load and create the texture.
    // Since this process involves asynchronous processing,
    // it must be performed at the beginning of drawing.
    if (this.labelLoader && -1 < highlightedLabelIndex) {
      if (!(highlightedLabelIndex in this.loadingLabelData)) {
        this.loadingLabelData[highlightedLabelIndex] = this.labelLoader
          .load(highlightedLabelIndex)
          .then(label => {
            label &&
              this.vrProgram.appendLabelData(highlightedLabelIndex, label);
          });
      }
      await this.loadingLabelData[highlightedLabelIndex];
    }

    if (!this.vrProgram.isActive()) {
      this.vrProgram.activate();
    }

    // set debug
    if (typeof viewState.debugMode !== 'undefined') {
      this.vrProgram.setDebugMode(viewState.debugMode);
    } else {
      this.vrProgram.setDebugMode(debugMode);
    }

    // this.vrProgram.setDicomVolume(this.volume!, this.mask);
    this.vrProgram.setVolumeCuboid(
      subVolume
        ? {
            offset: subVolume.offset,
            dimension: subVolume.dimension,
            voxelSize
          }
        : {
            offset: [0, 0, 0],
            dimension: voxelCount,
            voxelSize
          }
    );

    // Transfer function
    if (
      this.lastTransferFunction !== viewState.transferFunction &&
      viewState.transferFunction
    ) {
      this.vrProgram.setTransferFunction(viewState.transferFunction);
      this.lastTransferFunction = viewState.transferFunction;
    }

    // Vessel mask
    this.vrProgram.setMaskEnabled(!!viewState.enableMask);

    // Highlight label
    this.vrProgram.setHighlightLabel(highlightedLabelIndex);

    // Background
    this.vrProgram.setBackground(background || this.background);

    // Interporation
    this.vrProgram.setInterporationMode(interpolationMode);

    // Camera
    this.vrProgram.setCamera(camera);

    // Ray configuration
    this.vrProgram.setRay(camera, {
      voxelSize: this.metadata!.voxelSize!,
      intensity: rayIntensity,
      quality
    });

    this.vrProgram.run();

    return resolveImageData(this.glContext);
  }
}
