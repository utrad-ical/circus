import { ViewerEvent } from '../../viewer/viewer-event';
import { VoxelCloudToolBase } from './voxel-cloud-tool-base';

/**
 * BrushTool is a tool with which one can paint on an active voxel cloud.
 */
export class BrushTool extends VoxelCloudToolBase {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		this.dragDraw(ev, 1, 3);
	}

}
