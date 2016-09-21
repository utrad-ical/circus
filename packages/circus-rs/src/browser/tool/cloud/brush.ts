'use strict';

import { DraggableTool } from '../draggable';
import { ViewerEvent } from '../../viewer/viewer-event';
import { ViewState } from '../../view-state';
import { VoxelCloud } from '../../annotation/voxel-cloud';
import { VolumeImageSource } from '../../image-source/volume-image-source';
import { VoxelCloudTool } from './cloud';
import { PixelFormat } from '../../../common/PixelFormat';
import RawData from '../../../common/RawData';
import { translateSection } from '../../../common/geometry';

import { mmLine3 } from '../../geometry';

/**
 * BrushTool is a tool which ...
 */
function defaultCloud( vsize: [number,number,number], vcount?: [number,number,number] ): VoxelCloud {

	if( typeof vcount === 'undefined' )
		vcount = [ 32, 32, 32 ];

	const cloud = new VoxelCloud();
	const volume = new RawData();
	volume.setDimension( vcount[0], vcount[1], vcount[2], PixelFormat.Binary );
	volume.setVoxelDimension( vsize[0], vsize[1], vsize[2] );
	cloud.volume = volume;
	cloud.color = '#00ff00';
	cloud.alpha = 0.5;
	cloud.origin = [100,100,200]; // sample!

	// fill all for debug.
	let [ x,y,z ] = [0,0,0];
	for( z = 0; z < vcount[2]; z++ ){
		for( y = 0; y < vcount[1]; y++ ){
			for( x = 0; x < vcount[0]; x++ ){
				cloud.volume.writePixelAt( 1, x, y, z );
			}
		}
	}

	return cloud;
}

export class BrushTool extends VoxelCloudTool {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		const dragInfo = this.dragInfo;

	}

	public mouseDownHandler( ev: ViewerEvent ): void {
		// サンプルデータの作成
		const viewer = ev.viewer;
		const resolution = viewer.getResolution();
		const state = viewer.getState();
		const comp = viewer.getComposition();
		let cloud = this.getActiveCloud( comp );
		if( cloud === null && comp.imageSource instanceof VolumeImageSource ){
			const vsize = comp.imageSource.voxelSize();
			cloud = defaultCloud( vsize );
			cloud.active = true;
			comp.addAnnotation( cloud );
			console.log('add cloud annotation');
			console.log( cloud );
		}
		viewer.render();
	}

}
