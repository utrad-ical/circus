'use strict';

import { VoxelCloud }					from '../../../common/VoxelCloud';
import { Painter }						from '../../../browser/interface/painter';
import { Sprite }						from '../../../browser/viewer/sprite';

export class CloudsRenderer implements Painter {

	public clouds: VoxelCloud[];
	
	constructor() {
		this.clouds = [];
	}
	
	public draw( canvasDomElement, viewState ): Sprite {

		let context = canvasDomElement.getContext('2d');
		let section = viewState.section;
		let size = viewState.resolution;
		
		let imageData = context.getImageData( 0, 0, size[0], size[1] );
		let transparency = 0;
		
		this.clouds.forEach( (cloud) => {
		
			let color = cloud.color || [ 0xff, 0, 0, 0xff ];
			
			let rawSection = cloud.mmGetSection(
				section.origin,
				section.xAxis,
				section.yAxis,
				size,
				false
			);

			let srcidx = 0, pixel, dstidx;
			for (var y = 0; y < size[1]; y++) {
				for (var x = 0; x < size[0]; x++) {
					pixel = rawSection.read( srcidx );
					dstidx = srcidx << 2; // meaning multiply 4
					if( pixel !== transparency ){
						imageData.data[dstidx    ] = ( imageData.data[dstidx  ] * ( 0xff - color[3] ) + color[0] * color[3] ) / 0xff;
						imageData.data[dstidx + 1] = ( imageData.data[dstidx+1] * ( 0xff - color[3] ) + color[1] * color[3] ) / 0xff;
						imageData.data[dstidx + 2] = ( imageData.data[dstidx+2] * ( 0xff - color[3] ) + color[2] * color[3] ) / 0xff;
						imageData.data[dstidx + 3] = color[3];
					}
					srcidx++;
				}
			}
			
		} );
		
		context.putImageData( imageData, 0, 0 );
		return null;
	}

	public xdraw( canvasDomElement, viewState ): Sprite {
	
		let size = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ].map( i => Math.round(i) );
		let context = canvasDomElement.getContext('2d');

		/**
		 * get imageBuffer
		 */
		let u = viewState.section.xAxis.map( (i) => i / size[0] );
		let v = viewState.section.yAxis.map( (i) => i / size[1] );
		
		let imageData = context.getImageData( 0, 0, size[0], size[1] );
		
		let translateValue = 0;
		
		this.clouds.forEach( (cloud) => {
		
			let color = cloud.color || [ 0xff, 0, 0, 0xff ];
			let imageBuffer = new Uint8Array( size[0] * size[1] );
			
			/*
			cloud.scanCrossSection(
				viewState.section.origin,
				u,
				v,
				size as any,
				imageBuffer
			);
			*/
			cloud.scanOblique(
				viewState.section.origin,
				u,
				v,
				size as any,
				imageBuffer
			);

			let srcidx = 0, pixel, dstidx;
			for (var y = 0; y < size[1]; y++) {
				for (var x = 0; x < size[0]; x++) {
					pixel = imageBuffer[srcidx];
					dstidx = srcidx << 2; // meaning multiply 4
					if( pixel !== translateValue ){
						imageData.data[dstidx    ] = ( imageData.data[dstidx  ] * ( 0xff - color[3] ) + color[0] * color[3] ) / 0xff;
						imageData.data[dstidx + 1] = ( imageData.data[dstidx+1] * ( 0xff - color[3] ) + color[1] * color[3] ) / 0xff;
						imageData.data[dstidx + 2] = ( imageData.data[dstidx+2] * ( 0xff - color[3] ) + color[2] * color[3] ) / 0xff;
						imageData.data[dstidx + 3] = color[3];
					}
					srcidx++;
				}
			}
			
		} );
		
		context.putImageData( imageData, 0, 0 );
		return null;
	}
	
	// public draw( canvasDomElement, viewState ): Sprite {
	
		// if( this.clouds.length === 0 ) return null;
		
		// let drawClouds = this.clouds; // filtering clouds 
		
		// let dimension = this.clouds[0].getDimension();
		
		// let size = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ].map( i => Math.round(i) );
		// let context = canvasDomElement.getContext('2d');

		// let imageData = context.getImageData( 0, 0, size[0], size[1] );
		
		// let translateValue = 0;
		
		// let [rx, ry, rz] = dimension;
		// let [x, y, z] = viewState.section.origin;
		// let [eu_x, eu_y, eu_z] = viewState.section.xAxis.map( (i) => i / size[0] );
		// let [ev_x, ev_y, ev_z] = viewState.section.yAxis.map( (i) => i / size[1] );
		// let [outWidth, outHeight] = size;
		
		// let srcidx = 0, pixel, dstidx;

		// let  pos_x, pos_y, pos_z;
		
		// let r,g,b,a;
		// let layerCount;
		
		// for (let j = 0; j < outHeight; j++) {
			// [pos_x, pos_y, pos_z] = [x, y, z];

			// for (let i = 0; i < outWidth; i++) {
				// if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0 && pos_x <= rx - 1 && pos_y <= ry - 1 && pos_z <= rz - 1) {
				
					// dstidx = srcidx << 2; // meaning multiply 4
					
					// layerCount = 1;
					// r = imageData.data[ dstidx ];
					// g = imageData.data[ dstidx + 1 ];
					// b = imageData.data[ dstidx + 2 ];
					// a = imageData.data[ dstidx + 3 ];
					
					// drawClouds.forEach( (cloud) => {
						// if( cloud.getPixelWithInterpolation(pos_x, pos_y, pos_z) ){
							// r = ( r * ( 0xff - cloud.color[3] ) + cloud.color[0] * cloud.color[3] ) / 0xff;
							// g = ( g * ( 0xff - cloud.color[3] ) + cloud.color[1] * cloud.color[3] ) / 0xff;
							// b = ( b * ( 0xff - cloud.color[3] ) + cloud.color[2] * cloud.color[3] ) / 0xff;
							// layerCount++;
						// }
					// } );
					
					// imageData.data[ dstidx ] = Math.round( r );
					// imageData.data[ dstidx + 1 ] = Math.round( g );
					// imageData.data[ dstidx + 2 ] = Math.round( b );
					// imageData.data[ dstidx + 3 ] = 0xff;
					
				// }

				// pos_x += eu_x;
				// pos_y += eu_y;
				// pos_z += eu_z;
				
				// srcidx++;
			// }
			// x += ev_x;
			// y += ev_y;
			// z += ev_z;
		// }
		
		// context.putImageData( imageData, 0, 0 );
		// return null;
	// }
	
}

