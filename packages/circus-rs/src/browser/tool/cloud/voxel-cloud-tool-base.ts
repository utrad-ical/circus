import { Composition } from '../../composition';
import { VoxelCloud } from '../../annotation/voxel-cloud';
import { DraggableTool } from '../draggable';
import { Viewer } from '../../viewer/viewer';
import { VolumeImageSource } from '../../image-source/volume-image-source';
import * as su from '../../section-util';
import { Vector2D, Vector3D } from '../../../common/geometry';
import { vec3 } from 'gl-matrix';
import { draw3DLine } from '../../volume-util';


/**
 * VoxelCloudToolBase is a base tool that affects VoxelCloud annotation.
 */
export class VoxelCloudToolBase extends DraggableTool {
	protected activeCloud: VoxelCloud = null;

	protected draw3DLineWithValue(viewer: Viewer, start: Vector2D, end: Vector2D, value: number): void {
		const state = viewer.getState();
		const resolution = viewer.getResolution();
		const comp = viewer.getComposition();
		const src = comp.imageSource as VolumeImageSource;
		const voxelSize = src.voxelSize();

		if (!this.activeCloud) return; // no cloud to paint on
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
		const start3D = convertViewerPoint(start);
		const end3D = convertViewerPoint(end);

		// console.log(start3D, end3D);

		// draw a 3D line segment over a volume
		draw3DLine(activeCloud.volume, start3D, end3D, value);
		comp.annotationUpdated();
	}

	/**
	 * Find the active VoxelCloud annotation in a composition
	 * @return If there is only one active VoxelCloud instance, returns it.
	 */
	protected getActiveCloud(composition: Composition): VoxelCloud {
		let activeCloud: VoxelCloud = null;
		composition.annotations.forEach(
			antn => {
				if (antn instanceof VoxelCloud && antn.active) {
					if (activeCloud !== null)
						throw new Error('There are more than one active VoxelCloud.');
					activeCloud = antn;
				}
			}
		);
		return activeCloud;
	}

}
