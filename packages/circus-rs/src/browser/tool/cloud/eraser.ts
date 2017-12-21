import { ViewerEvent } from '../../viewer/viewer-event';
import { VoxelCloudToolBase } from './voxel-cloud-tool-base';

/**
 * EraserTool is a tool with which one can paint on an active voxel cloud.
 */
export class EraserTool extends VoxelCloudToolBase {
  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    this.dragDraw(ev, 0, 3);
  }
}
