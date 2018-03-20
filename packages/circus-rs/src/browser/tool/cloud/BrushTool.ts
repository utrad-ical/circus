import ViewerEvent from '../../viewer/ViewerEvent';
import VoxelCloudToolBase from './VoxelCloudToolBase';

/**
 * BrushTool is a tool with which one can paint on an active voxel cloud.
 */
export default class BrushTool extends VoxelCloudToolBase {
  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    this.dragDraw(ev, 1, 3);
  }
}
