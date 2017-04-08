import { ViewerEvent } from '../../viewer/viewer-event';
import { VoxelCloudToolBase } from './voxel-cloud-tool-base';

/**
 * BrushTool is a tool with which one can paint on an active voxel cloud.
 */
export class BrushTool extends VoxelCloudToolBase {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);

		const dragInfo = this.dragInfo;
		if (dragInfo.dx === 0 && dragInfo.dy === 0) return; // no mouse move

		this.draw3DLineWithValueAndWidth(
			ev.viewer,
			[this.pX, this.pY],
			[ev.viewerX, ev.viewerY],
			1,
			3
		);

		this.pX = ev.viewerX;
		this.pY = ev.viewerY;
	}

}
