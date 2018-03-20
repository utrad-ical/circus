import { ViewerEvent } from '../../viewer/viewer-event';
import VoxelCloudToolBase from './VoxelCloudToolBase';

/**
 * EraserTool is a tool with which one can paint on an active voxel cloud.
 */
export default class EraserTool extends VoxelCloudToolBase {
  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    this.dragDraw(ev, 0, 3);
  }
}
