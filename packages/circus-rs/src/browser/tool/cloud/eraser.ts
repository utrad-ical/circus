import { ViewerEvent } from '../../viewer/viewer-event';
import { VoxelCloudToolBase } from './voxel-cloud-tool-base';

/**
 * EraserTool is a tool with which one can paint on an active voxel cloud.
 */
export class EraserTool extends VoxelCloudToolBase {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);

		const dragInfo = this.dragInfo;
		if (dragInfo.dx === 0 && dragInfo.dy === 0) return; // no mouse move

		this.draw3DLineWithValue(
			ev.viewer,
			[this.pX, this.pY],
			[ev.viewerX, ev.viewerY],
			0
		);

		this.pX = ev.viewerX;
		this.pY = ev.viewerY;
	}

}
