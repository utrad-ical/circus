import { Vector3, Vector2 } from 'three';
import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';
import GLProgram, {
  Camera
} from './webgl-image-source/GLProgram';
import MprImageSource from './MprImageSource';
import { Section, vectorizeSection } from '../../common/geometry/Section';

type RGBA = [number, number, number, number];

interface WebGLImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
}

export default class WebGLImageSource extends MprImageSource {
  private backCanvas: HTMLCanvasElement;

  private glProgram: GLProgram;

  // Cache for checking update something.
  private lastWidth?: number;
  private lastHeight?: number;

  /**
   * For debugging
   */
  public static readyBeforeVolumeLoaded: boolean = false;
  public static defaultDebugMode: number = 0;
  public static backCanvasElement?: HTMLDivElement;

  constructor({ volumeLoader }: WebGLImageSourceOptions) {
    super();
    const backCanvas = this.initializeBackCanvas();
    const glContext = this.getWebGLContext(backCanvas);

    this.backCanvas = backCanvas;
    this.glProgram = new GLProgram(glContext);
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

    // Show the background canvas for debugging
    if (WebGLImageSource.backCanvasElement) {
      WebGLImageSource.backCanvasElement.insertBefore(
        backCanvas,
        WebGLImageSource.backCanvasElement.firstChild
      );
    }

    return backCanvas;
  }

  private getWebGLContext(
    backCanvas: HTMLCanvasElement
  ): WebGLRenderingContext {
    const gl =
      backCanvas.getContext('webgl') ||
      backCanvas.getContext('experimental-webgl');
    if (!gl) throw new Error('Failed to get WegGL context');
    return gl as WebGLRenderingContext;
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
    const maxSideLength = Math.max(...mmDimension);
    this.glProgram.setWorldCoordsBaseLength(maxSideLength);

    // Load volume and transfer as texture
    const volume = await volumeLoader.loadVolume();
    this.glProgram.setVolume(volume);
  }

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

    const {
      section,
      interpolationMode = 'nearestNeighbor',
      window
    } = viewState;

    const background: RGBA = [0, 0, 0, 0xff];
    const debugMode = WebGLImageSource.defaultDebugMode;

    // set debug
    this.glProgram.setDebugMode(debugMode);

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

    // Boundary box vertexes
    this.glProgram.setSectionBoundary(section, {
      offset: [0, 0, 0],
      dimension: voxelCount,
      voxelSize
    });

    // Transfer function
    // this.glProgram.setDebugMode(1);
    // const transferFunction = mprTransferFunction(viewState.window);
    // if (this.lastTransferFunction !== transferFunction && transferFunction) {
    //   this.glProgram.setTransferFunction(transferFunction);
    //   this.lastTransferFunction = transferFunction;
    // }

    // Background
    this.glProgram.setBackground(background);

    // Interporation
    this.glProgram.setInterporationMode(interpolationMode);

    // Camera
    const camera = this.createCamera(section);
    this.glProgram.setCamera(camera);

    // View window
    this.glProgram.setViewWindow(window);

    this.glProgram.run();

    return this.glProgram.resolveImageData();
  }

  private setCanvasSize(width: number, height: number) {
    this.backCanvas.width = width;
    this.backCanvas.height = height;
    this.glProgram.setViewport(0, 0, width, height);
  }

  private createCamera(section: Section): Camera {
    const { voxelCount } = this.metadata!;
    const { origin, xAxis, yAxis } = vectorizeSection(section);
    const [x, y, z] = voxelCount;

    // The camera target is The center of the section.
    const target = origin
      .clone()
      .addScaledVector(xAxis, 0.5)
      .addScaledVector(yAxis, 0.5);

    // Ensure the camera position is outside the (sub)volume.
    // And the position is preferably close to the volume to reduce the cost in the fragment shader.
    const distancesToEachVertex = [
      new Vector3(x, 0, 0),
      new Vector3(0, y, 0),
      new Vector3(0, 0, z),
      new Vector3(x, y, 0),
      new Vector3(0, y, z),
      new Vector3(x, 0, z),
      new Vector3(x, y, z),
    ].map(v => v.distanceTo(target));

    const farEnough = distancesToEachVertex.reduce(
      (dist, d) => (dist < d ? d : dist),
      0
    );

    const eyeLine = new Vector3()
      .crossVectors(xAxis, yAxis)
      .normalize()
      .multiplyScalar(farEnough);

    const position = new Vector3().addVectors(target, eyeLine);

    const up = yAxis.clone().normalize();

    // Determine camera zoom from viewport diagonal length
    const [mmOrigX, mmOrigY] = this.mmDim();
    const origDiagonalLength = new Vector2(mmOrigX, mmOrigY).length();
    const currentDiagonalLength = new Vector3()
      .addVectors(xAxis, yAxis)
      .length();

    const zoom = origDiagonalLength / currentDiagonalLength;

    // Return the camera which is adjusted the coordinate system to gl coodinate system.
    return { position, target, up, zoom };
  }
}
