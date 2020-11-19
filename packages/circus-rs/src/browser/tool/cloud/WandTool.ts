import { Section } from 'circus-rs/src/common/geometry';
import { Box3, Vector2, Vector3 } from 'three';
import { MprImageSource, RawData } from '../..';
import { detectOrthogonalSection } from '../../section-util';
import fuzzySelectWithFloodFill3D from '../../util/fuzzySelectWithFloodFill3D';
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

    const { type, section } = viewer.getState();
    if (type !== 'mpr') throw new Error('Unsupported view state');

    // const startPoint = this.convertViewerPoint(
    //   new Vector2(this.pX, this.pY),
    //   viewer
    // );

    // const { mode, threshold, maxDistance } = this.getOptions();

    const { startPoint, mode, threshold, maxDistance } = debugProvideStaticArgs(
      ev.original.ctrlKey,
      {
        startPoint: this.convertViewerPoint(
          new Vector2(this.pX, this.pY),
          viewer
        ),
        ...this.getOptions()
      }
    );

    const mprRawData = src.getDicomVolume();
    const cloudRawData = this.activeCloud.volume!;
    const voxelSize = new Vector3().fromArray(src.metadata!.voxelSize);

    // get mpr boundary box as OFFSET BASED one.
    // including the voxel that is on "max" of the box.
    const mprBoudaryOffsetBox = new Box3(
      new Vector3(0, 0, 0),
      new Vector3().fromArray(mprRawData.getDimension()).subScalar(1)
    );

    if (!mprBoudaryOffsetBox.containsPoint(startPoint)) return;

    const maxDistancesInIndex = new Vector3()
      .addScalar(maxDistance)
      .divide(voxelSize)
      .round();

    if (mode === '2d') adjustMaxDistancesAs2D(maxDistancesInIndex, section);

    const maxDistanceOffsetBox = new Box3(
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

    const targetOffsetBox = maxDistanceOffsetBox.intersect(mprBoudaryOffsetBox);
    debugConsoleLogArgs({ startPoint, mode, threshold, maxDistance });

    if (!this.activeCloud.expanded) this.activeCloud.expandToMaximum(src);

    // debugTruncateCloud(cloudRawData);

    const binarize = createBinarize(mprRawData, startPoint, threshold);
    const fillLine = createFillLine(targetOffsetBox, cloudRawData, this.value);

    const report = fuzzySelectWithFloodFill3D(
      startPoint,
      targetOffsetBox,
      binarize,
      fillLine
    );
    console.log(JSON.stringify(report, null, 2));

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
// function adjustSizeToDivisible8(size: Vector3D) {
//   if (size[0] % 8 !== 0) {
//     size[0] = Math.ceil(size[0] / 8) * 8;
//   }
// }

function createBinarize(
  mprRawData: RawData,
  startPoint: Vector3,
  threshold: number
) {
  const baseValue = mprRawData.getPixelAt(
    startPoint.x,
    startPoint.y,
    startPoint.z
  );
  const maxValue = baseValue + threshold;
  const minValue = baseValue - threshold;
  return (p: Vector3) => {
    const value = mprRawData.getPixelAt(p.x, p.y, p.z);
    return minValue <= value && value <= maxValue;
  };
}

function createFillLine(
  targetOffsetBox: Box3,
  cloudRawData: RawData,
  value: number
) {
  const { min } = targetOffsetBox;
  return (p1: Vector3, p2: Vector3) => {
    for (let x = p1.x; x <= p2.x; x++) {
      cloudRawData.writePixelAt(value, x - min.x, p1.y - min.y, p1.z - min.z);
    }
  };
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
let debugArgCounter = 0;
const debugProvideStaticArgs = (
  useStaticArgs: boolean,
  interactiveArgs: any
) => {
  if (useStaticArgs) {
    const staticArgs = debugArgs[++debugArgCounter % debugArgs.length];
    return staticArgs;
  } else {
    console.log(interactiveArgs);
    return interactiveArgs;
  }
};

function debugTruncateCloud(cloudRawData: RawData) {
  console.error('Truncate cloud data for debug');
  cloudRawData.fillAll(0);
}

function debugFillBounding(bounding: Box3, cloudRawData: RawData) {
  const [xmin, ymin, zmin] = bounding.min.toArray();
  const [xmax, ymax, zmax] = bounding.max.toArray();
  for (let z = zmin; z <= zmax; z++) {
    for (let y = ymin; y <= ymax; y++) {
      for (let x = xmin; x <= xmax; x++) {
        cloudRawData.writePixelAt(1, x, y, z);
      }
    }
  }
}

function debugConsoleLogArgs({
  startPoint,
  mode,
  threshold,
  maxDistance,
  targetOffsetBox
}: any) {
  console.log(
    JSON.stringify(
      {
        startPoint,
        mode,
        threshold,
        maxDistance
        // boundingBox: {
        //   ...targetOffsetBox,
        //   size: targetOffsetBox.getSize(new Vector3()).addScalar(1)
        // }
      },
      null,
      2
    )
  );
}
