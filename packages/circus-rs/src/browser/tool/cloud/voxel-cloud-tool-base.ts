import { Composition } from '../../composition';
import { VoxelCloud } from '../../annotation/voxel-cloud';
import { DraggableTool } from '../draggable';

/**
 * VoxelCloudToolBase is a base tool that affects VoxelCloud annotation.
 */
export class VoxelCloudToolBase extends DraggableTool {

	/**
	 * Find the active VoxelCloud annotation in a composition
	 * @return If there is only one active VoxelCloud instance, returns it.
	 */
	public getActiveCloud(composition: Composition): VoxelCloud {
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
