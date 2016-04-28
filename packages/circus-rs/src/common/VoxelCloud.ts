"use strict";
let {mat4, vec3} = require('gl-matrix');

import RawData from './RawData';
import {PixelFormat} from "./PixelFormat";
import { CrossSection } from '../browser/cross-section'
import { Vertex } from '../browser/vertex'

type RGBA = [number, number, number, number];
type Vector3D = [number, number, number];
type Vector2D = [number, number];

export class VoxelCloud extends RawData {
	public label: string;
	public offset: Vector3D;
	public color: RGBA;
	public dimensionOffset: Vector3D;
	public dimensionActiveRange: Vector3D;
	
	public setDimension(x: number, y: number, z: number): void {
		super.setDimension( x, y, z, PixelFormat.Binary );
	}
	
	public static combine( ...clouds: VoxelCloud[] ): VoxelCloud {
		
		if( clouds.length === 0 ) return null;

		let offset = [ Infinity, Infinity, Infinity ];
		let boundVertex = [ -Infinity, -Infinity, -Infinity ];

		clouds.forEach( c => {
			offset = [ 0, 1, 2 ].map( i => Math.min( offset[i], c.offset[i] + c.dimensionOffset[i] ) );
			boundVertex = [ 0, 1, 2 ].map(
				i => Math.max( boundVertex[i], c.offset[i] + c.dimensionOffset[i] + c.dimensionActiveRange[i] )
			);
		} );
		
		let dimension = [ boundVertex[0] - offset[0], boundVertex[1] - offset[1], boundVertex[2] - offset[2] ].map(
				i => Math.ceil( (i+1) / 8 ) * 8
			) as Vector3D;

		let cloud = new VoxelCloud();
		cloud.setDimension( dimension[0], dimension[1], dimension[2] );
		cloud.offset = offset as Vector3D;
		cloud.dimensionOffset = [0,0,0] as Vector3D;
		cloud.dimensionActiveRange = dimension as Vector3D;

		let dstData = new Uint8Array( cloud.data );
		let [rx, ry, rz] = cloud.size;
		
		/*
		clouds.forEach( c => {
			let [ ix1, iy1, iz1 ] = c.dimensionOffset;
			let [ ix2, iy2, iz2 ] = vec3.add( vec3.create(), c.dimensionActiveRange, c.dimensionOffset );
			let [ ix, iy, iz ] = c.getDimension();
			let [ ox, oy, oz ] = vec3.subtract( vec3.create(), c.offset, cloud.offset );
			
			ix1 = Math.floor( ix1 / 8 ) * 8;
			let bufLen = Math.ceil( ( ix2 - ix1 ) / 8 );

			
			let y,z;
			for( z = iz1; z < iz2; z++ ){
				for( y = iy1; y < iy2; y++ ) {
					let srcOffset = ( ( z * iy ) + ( y * ix ) + ix1 ) * c.bpp;
					let srcData = new Uint8Array( c.data, srcOffset, bufLen );
					
					let dstOffset = ( ( (z+oz) * ry ) + ( (y+oy) * rx ) + ox ) * cloud.bpp;
					let dstData = new Uint8Array( cloud.data, dstOffset, bufLen );
					
					for( let i = 0; i<bufLen; i++ ){
						if( srcData[i] ) console.log( srcOffset );
						dstData.set( srcData[i] | dstData[i], dstOffset + i );
					}
				}
			}
		} );
		*/
		
		clouds.forEach( c => {
			let [ ix1, iy1, iz1 ] = c.dimensionOffset;
			let [ ix2, iy2, iz2 ] = vec3.add( vec3.create(), c.dimensionActiveRange, c.dimensionOffset );
			
			let [ ox, oy, oz ] = vec3.subtract( vec3.create(), c.offset, cloud.offset );

			let x,y,z, pixel;
			for( z = iz1; z <= iz2; z++ ){
				for( y = iy1; y <= iy2; y++ ) {
					for( x = ix1; x <= ix2; x++ ){
						pixel = c.getPixelAt(x,y,z);
						if( pixel ) cloud.writePixelAt( pixel, x + ox, y + oy, z + oz );
					}
				}
			}
		} );
		return cloud;
	}
	
	public scanCrossSection(
		origin: Vector3D,
		eu: Vector3D,
		ev: Vector3D,
		outSize: Vector2D,
		image: {[index: number]: number}
	): void {
		let [rx, ry, rz] = this.size;
		let [x, y, z] = vec3.subtract( vec3.create(), origin, this.offset );
		let [eu_x, eu_y, eu_z] = eu;
		let [ev_x, ev_y, ev_z] = ev;
		let [outWidth, outHeight] = outSize;
		let imageOffset = 0;
		let value: number;
		
		for (let j = 0; j < outHeight; j++) {
			let [pos_x, pos_y, pos_z] = [x, y, z];

			for (let i = 0; i < outWidth; i++) {
				if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0
					&& pos_x <= rx - 1 && pos_y <= ry - 1 && pos_z <= rz - 1) {
					value = this.getPixelAt(Math.floor(pos_x), Math.floor(pos_y), Math.floor(pos_z));
				} else {
					value = 0;
				}
				if( value ){
					let idx = imageOffset << 2;
					image[ idx ] = 0;
					image[ idx+1 ] = 0;
					image[ idx+2 ] = 255;
					image[ idx+3 ] = 0xff;
				}
				imageOffset++;

				pos_x += eu_x;
				pos_y += eu_y;
				pos_z += eu_z;
			}
			x += ev_x;
			y += ev_y;
			z += ev_z;
		}
	}
}