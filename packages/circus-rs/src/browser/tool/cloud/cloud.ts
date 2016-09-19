import { vec3 } from 'gl-matrix';
import { EventEmitter } from 'events';
import { Composition } from '../../composition';
import { Annotation } from '../../annotation/annotation';
import { VoxelCloud } from '../../annotation/voxel-cloud';
import { DraggableTool } from '../draggable';

export class VoxelCloudTool extends DraggableTool {

	/**
	 * Find the VoxelCloud in a composition
	 */
	public getActiveCloud(composition: Composition): VoxelCloud {
		const annotations: Annotation[] = composition.annotations;
		let activeCloud: VoxelCloud = null;
		composition.annotations.forEach(
			(anno) => {
				if(anno instanceof VoxelCloud && anno.active) {
					if( activeCloud !== null )
						throw new Error('There are more than one active VoxelCloud.');
					activeCloud = anno;
				}
			}
		);
		return activeCloud;
	}

}
