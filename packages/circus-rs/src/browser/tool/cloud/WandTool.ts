import { Vector2 } from 'three';
import { MprImageSource } from '../..';
import { detectOrthogonalSection } from '../../section-util';
import fuzzySelect from '../../util/fuzzySelect';
import ViewerEvent from '../../viewer/ViewerEvent';
import VoxelCloudToolBase from './VoxelCloudToolBase';

export type SelectDataMode = '2d' | '3d';
export default class WandTool extends VoxelCloudToolBase {
  // TODO: define default values
  public static defaultMode: SelectDataMode = '3d';
  public static defaultThreshold: number = 450;
  public static defaultMaxDistance: number = 500;
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

    const startPoint = this.convertViewerPoint(
      new Vector2(this.pX, this.pY),
      viewer
    );

    const { mode, threshold, maxDistance } = this.getOptions();

    const mprRawData = src.getDicomVolume();
    const cloudRawData = this.activeCloud.volume!;

    if (!this.activeCloud.expanded) this.activeCloud.expandToMaximum(src);

    const target = mode === '2d' ? detectOrthogonalSection(section) : '3d';

    if (target === 'oblique') {
      throw new Error('You cannot use Wand tool 2D on oblique MPR image.');
    }

    const report = fuzzySelect(
      target,
      mprRawData,
      startPoint,
      threshold,
      maxDistance,
      cloudRawData,
      this.value
    );

    console.log({ startPoint, mode, threshold, maxDistance });
    console.log(JSON.stringify(report, null, 2));

    comp.annotationUpdated(ev.viewer);
  }
}
