import { Section } from 'circus-rs/src/common/geometry';
import { Box3, Vector2, Vector3 } from 'three';
import { MprImageSource, RawData, VoxelCloud } from '../..';
import { detectOrthogonalSection } from '../../section-util';
import fuzzySelect from '../../util/fuzzySelect';
import ViewerEvent from '../../viewer/ViewerEvent';
import VoxelCloudToolBase from './VoxelCloudToolBase';

export type SelectDataMode = '2d' | '3d';
export default class WandTool extends VoxelCloudToolBase {
  // TODO: define default values
  public static defaultMode: SelectDataMode = '3d';
  public static defaultThreshold: number = 0;
  public static defaultMaxDistance: number = 15;
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
    if (!this.activeCloud) return; // no cloud to paint on

    const viewer = ev.viewer;
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const src = comp.imageSource;
    if (!(src instanceof MprImageSource))
      throw new Error('Unsupported image source');

    const voxelSize = new Vector3().fromArray(src.metadata!.voxelSize);
    const dicomVolumeRawData = src.getDicomVolume();

    const { type, section } = viewer.getState();
    if (type !== 'mpr') throw new Error('Unsupported view state');

    console.error('=========================');
    console.error('Truncate cloud data for debug');
    console.error('=========================');
    this.activeCloud.volume?.fillAll(0);

    // const startPoint = this.convertViewerPoint(
    //   new Vector2(this.pX, this.pY),
    //   viewer
    // );

    // const { mode, threshold, maxDistance } = this.getOptions();

    const { startPoint, mode, threshold, maxDistance } = pickDebugArgs({
      startPoint: this.convertViewerPoint(
        new Vector2(this.pX, this.pY),
        viewer
      ),
      ...this.getOptions()
    });

    const maxDistancesInIndex = new Vector3(
      maxDistance,
      maxDistance,
      maxDistance
    )
      .clone()
      .divide(voxelSize)
      .round();

    if (mode === '2d') adjustMaxDistancesAs2D(maxDistancesInIndex, section);

    const volumeBoundingBox = new Box3(
      new Vector3(0, 0, 0),
      new Vector3().fromArray(dicomVolumeRawData.getDimension()).subScalar(1)
    );

    if (!volumeBoundingBox.containsPoint(startPoint)) return;

    const maxDistanceBox = new Box3(
      new Vector3(
        startPoint.x - maxDistancesInIndex.x,
        startPoint.y - maxDistancesInIndex.y,
        startPoint.z - maxDistancesInIndex.z
      ),
      new Vector3(
        startPoint.x + maxDistancesInIndex.x,
        startPoint.y + maxDistancesInIndex.y,
        startPoint.z + maxDistancesInIndex.z
      )
    );

    const boundingBox = maxDistanceBox.intersect(volumeBoundingBox);
    console.log(
      JSON.stringify(
        {
          startPoint,
          mode,
          threshold,
          maxDistance,
          boundingBox: {
            ...boundingBox,
            size: boundingBox.getSize(new Vector3()).addScalar(1)
          }
        },
        null,
        2
      )
    );

    const selectedRawData = fuzzySelect(
      dicomVolumeRawData,
      startPoint,
      boundingBox,
      threshold
    );

    // Apply changes to active cloud by merging selectedRawData.
    if (!this.activeCloud.expanded) this.activeCloud.expandToMaximum(src);
    applyChanges(this.activeCloud, this.value, selectedRawData, boundingBox);

    comp.annotationUpdated(ev.viewer);
  }
}

function adjustMaxDistancesAs2D(
  maxDistancesInIndex: Vector3,
  section: Section
) {
  const orientation = detectOrthogonalSection(section);
  if (orientation === 'oblique') {
    throw new Error('You cannot use Wand tool 2D on oblique MPR image.');
  }

  if (orientation === 'axial') {
    maxDistancesInIndex.z = 0;
  } else if (orientation === 'sagittal') {
    maxDistancesInIndex.x = 0;
  } else if (orientation === 'coronal') {
    maxDistancesInIndex.y = 0;
  }
}

/**
 * Apply fuzzy select result to a cloud.
 * @todo implement this function(now this is stub)
 */
function applyChanges(
  cloud: VoxelCloud, // must be expanded to ensure including "boundingBox".
  applyValue: number,
  applyRawData: RawData, // might have different size of boundingBox. (because the div 8 issue)
  boundingBox: Box3
) {
  const { min: min3, max: max3 } = boundingBox;
  const [xmin, ymin, zmin] = min3.toArray();
  const [xmax, ymax, zmax] = max3.toArray();

  const selected = (x: number, y: number, z: number) =>
    applyRawData.getPixelAt(x - xmin, y - ymin, z - zmin) === 1;

  for (let z = zmin; z <= zmax; z++) {
    for (let y = ymin; y <= ymax; y++) {
      for (let x = xmin; x <= xmax; x++) {
        if (selected(x, y, z)) {
          cloud.volume!.writePixelAt(applyValue, x, y, z);
        }
      }
    }
  }
}

let debugArgs = [
  {
    title: 'axial表示中心の白いところ 450/9999',
    startPoint: new Vector3(254, 250, 66),
    mode: '3d',
    threshold: 450,
    maxDistance: 9999
  }
];
const pickDebugArgs = (interactiveArg: any) => {
  if (debugArgs.length > 0) {
    // alert(debugArgs[0].title);
    return debugArgs.shift();
  } else {
    console.log(interactiveArg);
    return interactiveArg;
  }
};
