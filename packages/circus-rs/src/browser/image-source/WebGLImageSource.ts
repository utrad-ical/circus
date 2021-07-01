import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';
import GLProgram from './webgl-image-source/GLProgram';
import MprImageSource from './MprImageSource';
import VolumeCubeProgram from './webgl-image-source/shader/VolumeCubeProgram';
import { createCamera, createCameraToLookDownXYPlane, createCameraToLookSection, getWebGLContext, resolveImageData } from './webgl-image-source/webgl-util';
// import { mprTransferFunction } from './webgl-image-source/transfer-function-util';

type RGBA = [number, number, number, number];

interface WebGLImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
}

export default class WebGLImageSource extends MprImageSource {
  private backCanvas: HTMLCanvasElement;
  private glContext: WebGLRenderingContext;

  private glProgram: GLProgram;
  private volumeCubeProgram: VolumeCubeProgram;

  // Cache for checking update something.
  private lastWidth?: number;
  private lastHeight?: number;

  private maxSideLength: number = 0;

  /**
   * For debugging
   */
  public static readyBeforeVolumeLoaded: boolean = false;
  public static defaultDebugMode: number = 0;
  public static backCanvasElement?: HTMLDivElement;

  constructor({ volumeLoader }: WebGLImageSourceOptions) {
    super();
    const backCanvas = this.initializeBackCanvas();
    const glContext = getWebGLContext(backCanvas);
    this.glContext = glContext;

    glContext.clearColor(0.0, 0.0, 0.0, 0.0);
    glContext.clearDepth(1.0);

    this.backCanvas = backCanvas;
    this.glProgram = new GLProgram(glContext);
    // this.glProgram.use();

    this.volumeCubeProgram = new VolumeCubeProgram(glContext);

    this.loadSequence = this.load({ volumeLoader });
  }

  /**
   * @todo Implements webglcontextlost/webglcontextrestored
   */
  private initializeBackCanvas() {
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 1;
    backCanvas.height = 1;

    // backCanvas.addEventListener('webglcontextlost', _ev => {}, false);
    // backCanvas.addEventListener('webglcontextrestored', _ev => {}, false);

    return backCanvas;
  }

  private debugAttachCanvas() {
    WebGLImageSource.backCanvasElement = document.querySelector('#gl-backcanvas') as HTMLDivElement;
    // Show the background canvas for debugging
    if (WebGLImageSource.backCanvasElement) {
      WebGLImageSource.backCanvasElement.insertBefore(
        this.backCanvas,
        WebGLImageSource.backCanvasElement.firstChild
      );
    }
  }

  private async load({ volumeLoader }: { volumeLoader: DicomVolumeLoader; }) {
    this.metadata = await volumeLoader.loadMeta();

    // Set world coordinates length 1.0 as in mm
    const { voxelCount, voxelSize } = this.metadata;
    const mmDimension: [number, number, number] = [
      voxelCount[0] * voxelSize[0],
      voxelCount[1] * voxelSize[1],
      voxelCount[2] * voxelSize[2]
    ];
    this.maxSideLength = Math.max(...mmDimension);
    this.glProgram.setWorldCoordsBaseLength(this.maxSideLength);
    this.volumeCubeProgram.setWorldCoordsBaseLength(this.maxSideLength);

    // Load volume and transfer as texture
    const volume = await volumeLoader.loadVolume();
    this.glProgram.use();
    this.glProgram.setVolume(volume);
  }

  private drawCounter = 0;

  /**
   * Performs the main rendering.
   * @param viewer
   * @param viewState
   * @returns {Promise<ImageData>}
   */
  public async draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    const { voxelSize, voxelCount } = this.metadata!;

    if (viewState.type !== 'mpr')
      throw new Error('Unsupported view state.');

    this.debugAttachCanvas();

    const {
      section,
      interpolationMode = 'nearestNeighbor',
      window
    } = viewState;

    const background: RGBA = [0, 0, 0, 0];
    const debugMode = WebGLImageSource.defaultDebugMode;

    this.glContext.clearColor(0, 0, 1, 1);
    this.glContext.clear(this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT);

    // set back-canvas-size
    const [viewportWidth, viewportHeight] = viewer.getResolution();
    if (
      this.lastWidth !== viewportWidth ||
      this.lastHeight !== viewportHeight
    ) {
      this.setCanvasSize(viewportWidth, viewportHeight);
      this.lastWidth = viewportWidth;
      this.lastHeight = viewportHeight;
    }

    ////////////////////////////////////////////////
    // volumeCubeProgram

    this.volumeCubeProgram.use();

    const voCamera = createCamera(
      [128, 256, 66],
      [0, 0, -1000],
      0.2
    );
    this.volumeCubeProgram.setCamera(voCamera);
    this.volumeCubeProgram.run();

    // const voCamera2 = createCamera(
    //   [256, 256, 66],
    //   [1000, 1000, 1000],
    //   0.05
    // );
    // this.volumeCubeProgram.setCamera(voCamera2);
    // this.volumeCubeProgram.run();

    this.volumeCubeProgram.cleanup();

    ////////////////////////////////////////////////
    // glProgram
    this.glProgram.use();

    // set debug
    this.glProgram.setDebugMode(debugMode);
    this.glProgram.setVolumeInformation(voxelSize, voxelCount);
    this.glProgram.setSection(section);

    // Transfer function
    // this.glProgram.setDebugMode(2);
    // this.glProgram.setTransferFunction(mprTransferFunction(viewState.window));

    // Background ... fill points outside the volume but the section(=viewport).
    this.glProgram.setBackground([1, 0, 0, 1]);

    // Interporation
    this.glProgram.setInterporationMode(interpolationMode);

    // Camera
    const camera0 = createCameraToLookSection(
      section,
      this.metadata!.voxelCount,
      this.metadata!.voxelSize
    );
    const camera1 = createCameraToLookDownXYPlane(
      section,
      this.metadata!.voxelCount,
      this.metadata!.voxelSize
    );
    this.glProgram.setCamera(camera0);

    // View window
    this.glProgram.setViewWindow(window);

    this.glProgram.run();
    this.glProgram.cleanup();

    ////////////////////////////////////////////////
    this.glContext.flush();

    return resolveImageData(this.glContext);
  }

  private setCanvasSize(width: number, height: number) {
    this.backCanvas.width = width;
    this.backCanvas.height = height;
    this.glContext.viewport(0, 0, width, height);
  }
}

