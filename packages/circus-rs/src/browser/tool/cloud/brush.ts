import { ViewerEvent } from '../../viewer/viewer-event';
import { VoxelCloud } from '../../annotation/voxel-cloud';
import { VolumeImageSource } from '../../image-source/volume-image-source';
import { VoxelCloudToolBase } from './voxel-cloud-tool-base';
import { draw3DLine } from '../../volume-util';
import * as su from '../../section-util';
import { Vector2D, Vector3D } from '../../../common/geometry';
import { vec3 } from 'gl-matrix';

/**
 * BrushTool is a tool with which one can paint on an active voxel cloud.
 */
export class BrushTool extends VoxelCloudToolBase {
	private activeCloud: VoxelCloud = null;
	private pX: number;
	private pY: number;

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);

		if (!this.activeCloud) return; // no cloud to paint on
		const dragInfo = this.dragInfo;
		if (dragInfo.dx === 0 && dragInfo.dy === 0) return; // no mouse move

		const state = ev.viewer.getState();
		const resolution = ev.viewer.getResolution();
		const src = ev.viewer.getComposition().imageSource as VolumeImageSource;
		const voxelSize = src.voxelSize();
		const activeCloud = this.activeCloud;

		function convertViewerPoint(point: Vector2D): Vector3D {
			// from screen 2D coordinate to volume coordinate in millimeter
			const mmOfVol = su.convertScreenCoordinateToVolumeCoordinate(state.section, resolution, point);
			// from volume coordinate in millimeter to index coordinate
			const indexOfVol = su.convertPointToIndex(mmOfVol, voxelSize);
			// to local coordinate of the cloud (simple translation)
			const indexOfCloud = vec3.subtract(indexOfVol, indexOfVol, activeCloud.origin) as Vector3D;
			// round
			return [Math.round(indexOfCloud[0]), Math.round(indexOfCloud[1]), Math.round(indexOfCloud[2])] as Vector3D;
		}

		// convert mouse cursor location to cloud's local coordinate
		const start = convertViewerPoint([this.pX, this.pY]);
		const end = convertViewerPoint([ev.viewerX, ev.viewerY]);

		// console.log(start, end);

		// This draws a 3D line segment over a volume
		draw3DLine(this.activeCloud.volume, start, end);
		ev.viewer.render(); // TODO: replace with annotation-only rendering

		this.pX = ev.viewerX;
		this.pY = ev.viewerY;
	}

	public dragStartHandler(ev: ViewerEvent): void {
		super.dragStartHandler(ev);
		const comp = ev.viewer.getComposition();
		this.activeCloud = this.getActiveCloud(comp);
		this.pX = ev.viewerX;
		this.pY = ev.viewerY;
	}

}
