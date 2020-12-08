import ViewerEvent from '../../viewer/ViewerEvent';
import { ToolOptions } from '../Tool';
import VoxelCloudToolBase from './VoxelCloudToolBase';

export interface BrushToolOptions extends ToolOptions {
  width: number;
}

/**
 * BrushTool is a tool with which one can paint on an active voxel cloud.
 */
export default class BrushTool extends VoxelCloudToolBase<BrushToolOptions> {
  // Disable pointer lock API
  protected usePointerLockAPI = false;
  protected value = 1;
  protected options = {
    width: 1
  };

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    this.draw3DLineWithValueAndWidth(
      ev.viewer,
      [ev.viewerX!, ev.viewerY!],
      [ev.viewerX!, ev.viewerY!],
      this.value,
      this.options.width
    );
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    this.dragDraw(ev, this.value, this.options.width);
  }
}
