import { Vector3, Vector2 } from 'three';
import Viewer from '../viewer/Viewer';
import ViewState, { VrViewState, TransferFunction } from '../ViewState';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';
import VRGLProgram, {
  Camera
} from './webgl-image-source/VRGLProgram';
import RawData from '../../common/RawData';
import { LabelLoader } from './volume-loader/interface';
import {
  windowToTransferFunction,
  mprTransferFunction
} from './webgl-image-source/transfer-function-util';
import MprImageSource from './MprImageSource';
import { Section, vectorizeSection } from '../../common/geometry/Section';
import { createOrthogonalMprSection } from '../section-util';

interface SubVolume {
  offset: [number, number, number];
  dimension: [number, number, number];
}

interface VolumeLoader {
  loadVolume(): Promise<RawData>;
}

export default class WebGLImageSource extends MprImageSource {
  private backCanvas: HTMLCanvasElement;

  private vrProgram: VRGLProgram;
  private labelLoader?: LabelLoader;
  private loadingLabelData: Record<number, Promise<void>> = {};

  // Cache for checking update something.
  private lastTransferFunction?: TransferFunction;
  private lastSubVolume?: SubVolume;
  private lastWidth?: number;
  private lastHeight?: number;
  private lastEnableMask?: boolean;
  private lastHighlightedLabelIndex?: number;

  /**
   * For debugging
   */
  public static readyBeforeVolumeLoaded: boolean = false;
  public static defaultDebugMode: number = 0;
  public static backCanvasElement?: HTMLDivElement;

  constructor({
    volumeLoader,
    maskLoader,
    labelLoader
  }: {
    volumeLoader: DicomVolumeLoader;
    maskLoader?: VolumeLoader;
    labelLoader?: LabelLoader;
  }) {
    super();

    const backCanvas = this.initializeBackCanvas();
    const glContext = this.getWebGLContext(backCanvas);

    this.backCanvas = backCanvas;
    this.vrProgram = new VRGLProgram(glContext);
    this.loadSequence = this.load({ volumeLoader, maskLoader });
    this.labelLoader = labelLoader;
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

  private async load({
    volumeLoader,
    maskLoader
  }: {
    volumeLoader: DicomVolumeLoader;
    maskLoader?: VolumeLoader;
  }) {
    const metadata = await volumeLoader.loadMeta();
    this.metadata = metadata;

    // Set world coordinates length 1.0 as in mm
    const { voxelCount, voxelSize } = metadata;
    const mmDimension: [number, number, number] = [
      voxelCount[0] * voxelSize[0],
      voxelCount[1] * voxelSize[1],
      voxelCount[2] * voxelSize[2]
    ];
    const maxSideLength = Math.max(...mmDimension);
    this.vrProgram.setWorldCoordsBaseLength(maxSideLength);

    // Load volume data and transfer as texture
    const loadingVolumes = Promise.all([
      volumeLoader.loadVolume() as Promise<RawData>,
      maskLoader ? maskLoader.loadVolume() : Promise.resolve(undefined)
    ]).then(([volume, mask]) => this.vrProgram.setVolume(volume!, mask));

    // For debugging
    if (WebGLImageSource.readyBeforeVolumeLoaded) return;

    return loadingVolumes;
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
      background: this.defaultBackground(),
      subVolume: this.defaultSubVolume(),
      transferFunction: windowToTransferFunction(window),
      rayIntensity: 1.0,
      quality: 2.0
    };

    return state;
  }

  /**
   * Create whole of volume as initial subVolue.
   */
  private defaultSubVolume() {
    const { voxelCount } = this.metadata!;
    const subVolume: SubVolume = {
      offset: [0, 0, 0] as [number, number, number],
      dimension: voxelCount
    };
    return subVolume;
  }

  private defaultBackground(): [number, number, number, number] {
    return [0, 0, 0, 0xff];
  }

  /**
   * Performs the main rendering.
   * @param viewer
   * @param viewState
   * @returns {Promise<ImageData>}
   */
  public async draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    const { voxelSize, voxelCount } = this.metadata!;

    if (viewState.type !== 'vr' && viewState.type !== 'mpr')
      throw new Error('Unsupported view state.');

    const {
      type,
      section,
      interpolationMode = 'nearestNeighbor',
      highlightedLabelIndex = -1,
      rayIntensity = 1.0,
      quality = 2.0,
      subVolume = this.defaultSubVolume(),
      background = this.defaultBackground(),
      transferFunction,
      enableMask = false,
      debugMode = undefined
    } =
      viewState.type === 'vr'
        ? viewState
        : {
            ...viewState,
            transferFunction: mprTransferFunction(viewState.window),
            highlightedLabelIndex: undefined,
            rayIntensity: 0.1,
            quality: undefined,
            subVolume: undefined,
            background: undefined,
            enableMask: undefined,
            debugMode: undefined
          };

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

    this.vrProgram.setDrawMode(type);

    // set debug
    if (typeof debugMode !== 'undefined') {
      this.vrProgram.setDebugMode(debugMode);
    } else if (WebGLImageSource.defaultDebugMode) {
      this.vrProgram.setDebugMode(WebGLImageSource.defaultDebugMode);
    }

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
    switch (type) {
      case 'vr':
        if (this.lastSubVolume !== subVolume) {
          this.vrProgram.setDrawingBoundary({
            offset: subVolume.offset,
            dimension: subVolume.dimension,
            voxelSize
          });
          this.lastSubVolume = subVolume;
        }
        break;
      case 'mpr':
        this.vrProgram.setSectionBoundary(section, {
          offset: [0, 0, 0],
          dimension: voxelCount,
          voxelSize
        });
        break;
    }

    // Transfer function
    if (this.lastTransferFunction !== transferFunction && transferFunction) {
      this.vrProgram.setTransferFunction(transferFunction);
      this.lastTransferFunction = transferFunction;
    }

    // Vessel mask
    if (this.lastEnableMask !== enableMask) {
      this.vrProgram.toggleMask(!!enableMask);
      this.lastEnableMask = enableMask;
    }

    // Highlight label
    if (this.lastHighlightedLabelIndex !== highlightedLabelIndex) {
      this.vrProgram.setHighlightLabel(highlightedLabelIndex);
    }

    // Background
    this.vrProgram.setBackground(background);

    // Interporation
    this.vrProgram.setInterporationMode(interpolationMode);

    // Camera
    const camera = this.createCamera(section, subVolume, type);
    this.vrProgram.setCamera(camera);

    // Ray configuration
    this.configureRay(camera, { quality, rayIntensity });

    this.vrProgram.run();

    return this.vrProgram.resolveImageData();
  }

  private setCanvasSize(width: number, height: number) {
    this.backCanvas.width = width;
    this.backCanvas.height = height;
    this.vrProgram.setViewport(0, 0, width, height);
  }

  private createCamera(
    section: Section,
    subVolume: SubVolume,
    type: 'vr' | 'mpr'
  ): Camera {
    const { origin, xAxis, yAxis } = vectorizeSection(section);
    const offset = new Vector3().fromArray(subVolume.offset);
    const dim = new Vector3().fromArray(subVolume.dimension);

    // The camera target is The center of the section.
    const target = origin
      .clone()
      .addScaledVector(xAxis, 0.5)
      .addScaledVector(yAxis, 0.5);

    // Ensure the camera position is outside the (sub)volume.
    // And the position is preferably close to the volume to reduce the cost in the fragment shader.
    const distancesToEachVertex = [
      offset,
      new Vector3().addVectors(offset, new Vector3(dim.x, 0, 0)),
      new Vector3().addVectors(offset, new Vector3(0, dim.y, 0)),
      new Vector3().addVectors(offset, new Vector3(0, 0, dim.z)),
      new Vector3().addVectors(offset, new Vector3(dim.x, dim.y, 0)),
      new Vector3().addVectors(offset, new Vector3(0, dim.y, dim.z)),
      new Vector3().addVectors(offset, new Vector3(dim.x, 0, dim.z)),
      new Vector3().addVectors(offset, dim)
    ].map(v => v.distanceTo(target));

    const farEnough = distancesToEachVertex.reduce(
      (dist, d) => (dist < d ? d : dist),
      0
    );

    const eyeLine = new Vector3()
      .crossVectors(xAxis, yAxis)
      .normalize()
      .multiplyScalar(type === 'mpr' ? 1 : farEnough);

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

  private configureRay(
    camera: Camera,
    {
      quality,
      rayIntensity
    }: {
      quality: number;
      rayIntensity: number;
    }
  ) {
    this.vrProgram.setRay(camera, {
      voxelSize: this.metadata!.voxelSize!,

      intensity: rayIntensity,
      quality
    });
  }
}
