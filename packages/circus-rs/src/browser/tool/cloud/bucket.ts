import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { VoxelCloudToolBase } from './voxel-cloud-tool-base';
import { Vector2D } from '../../../common/geometry';
import { floodFillOnSlice } from '../../volume-util';
import { detectOrthogonalSection } from '../../section-util';

/**
 * Bucket tool performs the flood-fill operation along an orthogonal MPR plane.
 */
export class BucketTool extends VoxelCloudToolBase {
  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    const viewer = ev.viewer;
    const state = viewer.getState();
    if (state.type !== 'mpr') throw new Error('Unsupported view state');
    const section = state.section;
    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen

    if (!section) return;

    this.activeCloud = this.getActiveCloud(comp);
    if (!this.activeCloud) return; // no cloud to paint on

    // convert mouse cursor location to cloud's local coordinate
    const viewerPoint: Vector2D = [ev.viewerX, ev.viewerY];
    const volumePoint = this.convertViewerPoint(viewerPoint, viewer);

    // determine the orientation of section.
    const orientation = detectOrthogonalSection(section);
    if (orientation === 'oblique') {
      alert('You cannot use bucket tool on oblique MPR image.');
      return;
    }

    // perform flood-fill on the active cloud
    floodFillOnSlice(this.activeCloud.volume, volumePoint, orientation);

    // draw a 3D line segment over a volume
    comp.annotationUpdated();
  }
}
