import { vec3 } from 'gl-matrix';
import { EventEmitter } from 'events';
import { Composition } from '../../composition';
import { Annotation } from '../../annotation/annotation';
import { VoxelCloud } from '../../annotation/voxel-cloud';
import { DraggableTool } from '../draggable';

export abstract class VoxelCloudTool extends DraggableTool {

	/**
	 * アクティブなクラウドを取得する
	 * TODO: translate comment
	 */
	public getActiveCloud( composition: Composition ): VoxelCloud {
		const annotations: Annotation[] = composition.getAnnotations();
		let activeCloud: VoxelCloud = null;
		annotations.forEach(
			(anno) => {
				if( anno instanceof VoxelCloud && anno.active ){
					if( activeCloud !== null )
						throw new Error('TRANSLATE: アクティブなクラウドアノテーションが複数あります');
					activeCloud = anno;
				}
			}
		);
		return activeCloud;
	}
	
}
