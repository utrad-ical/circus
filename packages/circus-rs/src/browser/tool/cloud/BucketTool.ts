import { Vector3 } from 'three';
import { Vector3D } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import { isMprImageSourceWithDicomVolume } from '../../image-source/MprImageSourceWithDicomVolume';
import { detectOrthogonalSection } from '../../section-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { floodFillOnSlice } from '../../volume-util';
import { convertViewerPointToVolumeIndex } from '../tool-util';
import VoxelCloudToolBase from './VoxelCloudToolBase';

/**
 * Bucket tool performs the flood-fill operation along an orthogonal MPR plane.
 */
export default class BucketTool extends VoxelCloudToolBase {
  protected erase = false;
  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewState) throw new Error('View state not initialized');
    if (viewState.type !== 'mpr') throw new Error('Unsupported view state');
    const section = viewState.section;
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    if (!section) return;

    this.activeCloud = this.getActiveCloud(comp);
    if (!this.activeCloud) return; // no cloud to paint on

    // convert mouse cursor location to cloud's local coordinate
    const volumeIndex = convertViewerPointToVolumeIndex(
      viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    const cloudIndex = this.activeCloud.getInternalIndexFromVolumeCoordinate(
      volumeIndex.toArray() as Vector3D
    );

    // determine the orientation of section.
    const orientation = detectOrthogonalSection(section);
    if (orientation === 'oblique') {
      alert('You cannot use bucket tool on oblique MPR image.');
      return;
    }

    const src = comp.imageSource;
    if (
      !(src instanceof MprImageSource) ||
      !isMprImageSourceWithDicomVolume(src)
    ) {
      throw new Error('Unsupported image source');
    }
    if (!this.activeCloud.expanded) this.activeCloud.expandToMaximum(src);

    const dim = this.activeCloud.volume!.getDimension();
    if (cloudIndex.some((num, index) => num < 0 || dim[index] <= num)) {
      alert('Click within the image.');
      return;
    }

    // perform flood-fill on the active cloud
    floodFillOnSlice(
      this.activeCloud.volume!,
      new Vector3().fromArray(cloudIndex),
      orientation,
      this.erase
    );

    // draw a 3D line segment over a volume
    comp.annotationUpdated();
  }
}
