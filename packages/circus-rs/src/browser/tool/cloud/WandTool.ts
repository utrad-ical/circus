import DicomVolume from 'circus-rs/src/common/DicomVolume';
import { Vector3D } from 'circus-rs/src/common/geometry';
import { Vector2 } from 'three';
import { MprImageSource, RawData } from '../..';
import { detectOrthogonalSection } from '../../section-util';
import fuzzySelect from '../../util/fuzzySelect';
import ViewerEvent from '../../viewer/ViewerEvent';
import VoxelCloudToolBase from './VoxelCloudToolBase';

export type SelectDataMode = '2d' | '3d';
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

  protected getOptions() {
    const options = this.options as any;
    const mode: SelectDataMode = options.mode;
    const threshold: number = options.threshold;
    const maxDistance: number = options.maxDistance;
    return { mode, threshold, maxDistance };
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    ev.stopPropagation();

    const viewer = ev.viewer;
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const state = viewer.getState();
    if (state.type !== 'mpr') throw new Error('Unsupported view state');

    const src = comp.imageSource as MprImageSource;
    if (!src) throw new Error('Unsupported image source');
    const dicomVolumeRawData = src.getDicomVolume();

    if (!this.activeCloud) return; // no cloud to paint on

    const viewerPoint = this.convertViewerPoint(
      new Vector2(this.pX, this.pY),
      viewer
    );

    const options = this.getOptions();

    const section = state.section;
    if (!section) return;
    const orientation = detectOrthogonalSection(section);
    if (orientation === 'oblique' && options.mode === '2d') {
      alert('You cannot use Wand tool 2D on oblique MPR image.');
      return;
    }

    const detectMaxDistance = () => {
      const maxDistance = dicomVolumeRawData
        .getVoxelSize()
        .map(v => Math.floor(options.maxDistance / v));
      if (options.mode === '2d') {
        if (orientation === 'axial') {
          maxDistance[2] = 0;
        } else if (orientation === 'sagittal') {
          maxDistance[0] = 0;
        } else if (orientation === 'coronal') {
          maxDistance[1] = 0;
        }
      }
      return maxDistance;
    };

    const params = {
      startPoint: viewerPoint.toArray() as Vector3D,
      maxDistance: detectMaxDistance() as Vector3D,
      threshold: options.threshold,
      value: this.value
    };

    this.activeCloud.expandToMaximum(src);
    applyMagicWand(this.activeCloud.volume!, dicomVolumeRawData, params);

    comp.annotationUpdated(ev.viewer);
  }
}

function applyMagicWand(
  voxelCloudRawData: RawData,
  dicomVolumeRawData: DicomVolume,
  params: {
    startPoint: Vector3D; // control point (not mm!)
    maxDistance: Vector3D; // maximum distance from the startPoint (not mm!)
    threshold: number;
    value: number;
  }
): void {
  const { startPoint, maxDistance, threshold, value } = params;

  const selectedOffset = startPoint.map((v, i) =>
    Math.max(0, v - maxDistance[i])
  );
  const selectedRawData = fuzzySelect(
    dicomVolumeRawData,
    startPoint,
    maxDistance,
    threshold
  );
  const selectedSize = selectedRawData.getDimension();

  const [xmin, ymin, zmin] = selectedOffset;
  const [xmax, ymax, zmax] = selectedOffset.map((v, i) => v + selectedSize[i]);
  for (let z = zmin; z < zmax; z++) {
    for (let y = ymin; y < ymax; y++) {
      for (let x = xmin; x < xmax; x++) {
        if (selectedRawData.getPixelAt(x - xmin, y - ymin, z - zmin) === 1) {
          voxelCloudRawData.writePixelAt(value, x, y, z);
        }
      }
    }
  }
}
