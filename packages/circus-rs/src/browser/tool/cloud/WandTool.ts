import { Vector2 } from 'three';
import MprImageSource from '../../image-source/MprImageSource';
import { isMprImageSourceWithDicomVolume } from '../../image-source/MprImageSourceWithDicomVolume';
import { detectOrthogonalSection } from '../../section-util';
import fuzzySelect from '../../util/fuzzySelect';
import ViewerEvent from '../../viewer/ViewerEvent';
import { ToolOptions } from '../Tool';
import VoxelCloudToolBase from './VoxelCloudToolBase';

export type WandToolMode = '2d' | '3d';

export interface WandToolOptions extends ToolOptions {
  mode: WandToolMode;
  threshold: number;
  maxDistance: number;
}

export default class WandTool extends VoxelCloudToolBase<WandToolOptions> {
  protected fillValue = 1;
  protected options: WandToolOptions = {
    mode: '3d',
    threshold: 450,
    maxDistance: 500
  };

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    ev.stopPropagation();
    if (!this.activeCloud) return; // no cloud to paint on

    const viewer = ev.viewer;
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    const src = comp.imageSource;
    if (
      !(src instanceof MprImageSource) ||
      !isMprImageSourceWithDicomVolume(src)
    ) {
      throw new Error('Unsupported image source');
    }

    const { type, section } = viewer.getState();
    if (type !== 'mpr') throw new Error('Unsupported view state');

    const startPoint = this.convertViewerPoint(
      new Vector2(this.pX, this.pY),
      viewer
    );

    const { mode, threshold, maxDistance } = this.options;

    const mprRawData = src.getLoadedDicomVolume();
    if (mprRawData === undefined) throw new Error('The volume is not loaded.');
    const cloudRawData = this.activeCloud.volume!;

    if (!this.activeCloud.expanded) this.activeCloud.expandToMaximum(src);

    const target = mode === '2d' ? detectOrthogonalSection(section) : '3d';

    if (target === 'oblique') {
      throw new Error('You cannot use Wand tool 2D on oblique MPR image.');
    }

    fuzzySelect(
      target,
      mprRawData,
      startPoint,
      threshold,
      maxDistance,
      cloudRawData,
      this.fillValue
    );

    comp.annotationUpdated(ev.viewer);
  }
}
