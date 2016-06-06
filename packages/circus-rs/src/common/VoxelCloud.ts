"use strict";
let {mat4, vec3} = require('gl-matrix');

import RawData from './RawData';
import {PixelFormat} from "./PixelFormat";

type RGBA = [number, number, number, number];
type Vector3D = [number, number, number];
type Vector2D = [number, number];

export class VoxelCloud extends RawData {
	public label: string;
	public offset: Vector3D;
	public fillSize: Vector3D;
	public color: RGBA;
	
	public padding: Vector2D; // Number of pixels in a slice must be a multiple of 8.
	
	
	public setDimension(x: number, y: number, z: number): void {
		this.offset = [ 0, 0, 0 ];
		this.fillSize = [ x, y, z ];
		super.setDimension( x, y, z, PixelFormat.Binary );
	}
	
	/**
	 * ボリュームを最小化
	 */
	private expanded: boolean = true;
	
	public shrink(): void {
	}
	public expand(): void {
	}
	
	/**
	 * 
	 */
	public checkCross(): boolean {
		return true;
	}
	
	
	/**
	 * 
	 */
	// public scanCrossSectionWidthOffset(
		// origin: Vector3D,
		// eu: Vector3D,
		// ev: Vector3D,
		// outSize: Vector2D,
		// image: {[index: number]: number}
	// ): void {
		// let [rx, ry, rz] = this.fillSize;
		// let [x, y, z] = vec3.subtract( vec3.create(), origin, this.offset );
		// let [eu_x, eu_y, eu_z] = eu;
		// let [ev_x, ev_y, ev_z] = ev;
		// let [outWidth, outHeight] = outSize;
		// let imageOffset = 0;
		// let value: number;
		
		// let [r,g,b,a] = this.color;
		
		// for (let j = 0; j < outHeight; j++) {
			// let [pos_x, pos_y, pos_z] = [x, y, z];

			// for (let i = 0; i < outWidth; i++) {
				// if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0
					// && pos_x <= rx - 1 && pos_y <= ry - 1 && pos_z <= rz - 1) {
					// value = this.getPixelAt(Math.floor(pos_x), Math.floor(pos_y), Math.floor(pos_z));
				// } else {
					// value = 0;
				// }
				// if( value ){
					// let idx = imageOffset << 2;
					// image[ idx ] = r;
					// image[ idx+1 ] = g;
					// image[ idx+2 ] = b;
					// image[ idx+3 ] = a;
				// }
				// imageOffset++;

				// pos_x += eu_x;
				// pos_y += eu_y;
				// pos_z += eu_z;
			// }
			// x += ev_x;
			// y += ev_y;
			// z += ev_z;
		// }
	// }
}