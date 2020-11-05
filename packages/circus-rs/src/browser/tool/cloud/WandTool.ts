import { Vector2, Vector3 } from 'three';
import {
  AnisotropicRawData,
  MprImageSource,
  RawData,
  RawVolumeMprImageSource,
  Vector3D,
  Viewer,
  ViewState
} from '../..';
import { convertPointToMm, detectOrthogonalSection } from '../../section-util';
import fuzzySelect from '../../util/fuzzySelect';
import ViewerEvent from '../../viewer/ViewerEvent';
import VoxelCloudToolBase from './VoxelCloudToolBase';

export default class WandTool extends VoxelCloudToolBase {
  // TODO: define default values
  public static defaultMode = '3d';
  public static defaultThreshold = 0;
  public static defaultMaxDistance = 15;
  protected value = 1;

  constructor() {
    super();
    this.options = {
      ...this.options,
      mode: WandTool.defaultMode,
      threshold: WandTool.defaultThreshold,
      maxDistance: WandTool.defaultMaxDistance
    };
  }
  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);

    ev.stopPropagation();

    const viewer = ev.viewer;
    const state = viewer.getState();
    if (state.type !== 'mpr') throw new Error('Unsupported view state');
    const section = state.section;
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    if (!section) return;
    const orientation = detectOrthogonalSection(section);
    if (orientation === 'oblique') {
      alert('You cannot use Wand tool on oblique MPR image.');
      return;
    }

    const src = comp.imageSource as RawVolumeMprImageSource;
    if (!src) return;

    this.activeCloud = this.getActiveCloud(comp);

    this.draw(viewer, src);

    comp.annotationUpdated(ev.viewer);
  }

  protected draw(viewer: Viewer, src: RawVolumeMprImageSource): void {
    if (!this.activeCloud) return; // no cloud to paint on

    // convert mouse cursor location to cloud's local coordinate
    const viewerPoint = new Vector2(this.pX, this.pY);
    const mode = (this.options as any).mode;
    const threshold = (this.options as any).threshold;
    const maxDistance = (this.options as any).maxDistance;
    const value = this.value;
    const option = {
      mode,
      threshold,
      maxDistance,
      value
    };
    this.drawApproximatePixelWithValue(viewer, viewerPoint, option);
  }

  private drawApproximatePixelWithValue(
    viewer: Viewer,
    viewerPoint: Vector2,
    option: {
      mode: ImageDataMode;
      threshold: number;
      maxDistance: number;
      value: number;
    }
  ): void {
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const src = comp.imageSource as MprImageSource;
    if (!src) throw new Error('Unsupported image source');
    const volume = src.getDicomVolume();

    if (!this.activeCloud) return; // no cloud to paint on

    // Expand the target volume so that it covers the source image
    const activeCloud = this.activeCloud;
    activeCloud.expandToMaximum(src);

    const viewState = viewer.getState();
    const center = this.convertViewerPoint(viewerPoint, viewer);
    const approximatePixelsRawData = createApproximatePixelsRawData(
      viewState,
      volume,
      center,
      option
    );
    if (!approximatePixelsRawData) return;
    const fuzzySelectRawData = fuzzySelect(approximatePixelsRawData, [
      center.x,
      center.y,
      center.z
    ]);
    if (!fuzzySelectRawData) return;

    // draw a 3D points over a volume
    const [xmax, ymax, zmax] = activeCloud.volume!.getDimension();
    for (let z = 0; z < zmax; z++) {
      for (let y = 0; y < ymax; y++) {
        for (let x = 0; x < xmax; x++) {
          if (fuzzySelectRawData.getPixelAt(x, y, z) === 1) {
            activeCloud.volume!.writePixelAt(
              option.value,
              Math.floor(x),
              Math.floor(y),
              Math.floor(z)
            );
          }
        }
      }
    }
  }
}
export type ImageDataMode = '2d' | '3d';
export function createApproximatePixelsRawData(
  viewState: ViewState,
  rawData: AnisotropicRawData,
  center: Vector3, // control point (not mm!)
  option: {
    mode: ImageDataMode;
    threshold: number;
    maxDistance: number;
  }
): RawData | undefined {
  if (viewState.type !== 'mpr') throw new Error('Unsupported view state');

  const pixelAt = (pos: Vector3D) => {
    const [x, y, z] = pos;
    return rawData.getPixelNearestNeighbor(x, y, z);
  };

  const basisPixel = pixelAt([center.x, center.y, center.z]);
  if (!basisPixel) return;

  const pixelRange = (() => {
    const { threshold } = option;
    const min = Math.max(0, basisPixel - threshold);
    const max = basisPixel + threshold;
    return { min, max };
  })();

  const withinThreshold = (pixel?: number): boolean => {
    return pixel ? pixelRange.min <= pixel && pixel <= pixelRange.max : false;
  };

  const voxelSize = new Vector3().fromArray(rawData.getVoxelSize());
  const mmCenter = convertPointToMm(center, voxelSize);

  const [minX, maxX, minY, maxY, minZ, maxZ] = (() => {
    const { mode, maxDistance } = option;
    const size = rawData.getDimension();
    const voxelSize = rawData.getVoxelSize();

    const min = [mmCenter.x, mmCenter.y, mmCenter.z].map((v, i) =>
      Math.max(0, Math.floor((v - maxDistance) / voxelSize[i]))
    );
    const max = [mmCenter.x, mmCenter.y, mmCenter.z].map((v, i) =>
      Math.min(size[i] - 1, Math.floor((v + maxDistance) / voxelSize[i]))
    );

    const orientation = detectOrthogonalSection(viewState.section);
    switch (orientation) {
      case 'axial':
        return [
          min[0],
          max[0],
          min[1],
          max[1],
          mode === '2d' ? center.z : min[2],
          mode === '2d' ? center.z : max[2]
        ];
      case 'sagittal':
        return [
          mode === '2d' ? center.x : min[0],
          mode === '2d' ? center.x : max[0],
          min[1],
          max[1],
          min[2],
          max[2]
        ];
      case 'coronal':
        return [
          min[0],
          max[0],
          mode === '2d' ? center.y : min[1],
          mode === '2d' ? center.y : max[1],
          min[2],
          max[2]
        ];
      default:
        return [min[0], max[0], min[1], max[1], min[2], max[2]];
    }
  })();

  const dst = new RawData(rawData.getDimension(), 'binary');
  for (let z = minZ; z <= maxZ; z++) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const pos: Vector3D = [x, y, z];
        const value = pixelAt(pos);
        if (withinThreshold(value)) dst.writePixelAt(1, x, y, z);
      }
    }
  }
  return dst;
}
