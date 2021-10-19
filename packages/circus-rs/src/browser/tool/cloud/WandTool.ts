import { getSectionAsSectionInDrawingViewState } from '../..';
import MprImageSource from '../../image-source/MprImageSource';
import { isMprImageSourceWithDicomVolume } from '../../image-source/MprImageSourceWithDicomVolume';
import { detectOrthogonalSection } from '../../section-util';
import fuzzySelect from '../../util/fuzzySelect';
import ViewerEvent from '../../viewer/ViewerEvent';
import { ToolOptions } from '../Tool';
import { convertViewerPointToVolumeIndex } from '../tool-util';
import VoxelCloudToolBase from './VoxelCloudToolBase';

export type WandToolMode = '2d' | '3d';
export type ReferenceValueOption = 'clickPoint' | number;

export interface WandToolOptions extends ToolOptions {
  mode: WandToolMode;
  threshold: number;
  maxDistance: number;
  baseValue: ReferenceValueOption;
}

export default class WandTool extends VoxelCloudToolBase<WandToolOptions> {
  protected fillValue = 1;
  protected options: WandToolOptions = {
    mode: '3d',
    threshold: 450,
    maxDistance: 500,
    baseValue: 'clickPoint'
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

    const viewState = viewer.getState();
    const type = viewState.type;
    if (type !== 'mpr') throw new Error('Unsupported view state');

    const section = getSectionAsSectionInDrawingViewState(viewState);

    const startPoint = convertViewerPointToVolumeIndex(
      viewer,
      this.pX!,
      this.pY!
    );

    const { mode, threshold, maxDistance, baseValue } = this.options;

    const rawData = src.getLoadedDicomVolume();
    if (rawData === undefined) throw new Error('The volume is not loaded.');
    const cloudRawData = this.activeCloud.volume!;

    if (!this.activeCloud.expanded) this.activeCloud.expandToMaximum(src);

    const target = mode === '2d' ? detectOrthogonalSection(section) : '3d';

    if (target === 'oblique') {
      throw new Error('You cannot use Wand tool 2D on oblique MPR image.');
    }

    const actualBaseValue =
      typeof baseValue === 'number'
        ? baseValue
        : rawData.getPixelAt(startPoint.x, startPoint.y, startPoint.z);

    fuzzySelect(
      target,
      rawData,
      startPoint,
      actualBaseValue,
      threshold,
      maxDistance,
      cloudRawData,
      this.fillValue
    );

    comp.annotationUpdated(ev.viewer);
  }
}
