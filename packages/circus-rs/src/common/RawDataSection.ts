// Raw voxel container class

import { Promise } from 'es6-promise';
import { PixelFormat, PixelFormatInfo, pixelFormatInfo } from './PixelFormat';

export type Vector3D = [number, number, number];
export type Vector2D = [number, number];

export class RawDataSection {

	public width: number;
	public height: number;
	public data: ArrayBuffer;
	public read: ( offset: number ) => number;
	public write: ( offset: number, value: number ) => void;
	private view: {[offset: number]: number};
	
	public applyWindow( width: number, level: number ){
		let len = this.width * this.height;
		let data = new ArrayBuffer( len );
		let view = new Uint8Array( data );
		let p = 0;
		while( p < len ){
			let v = Math.round( ( this.read(p) - level + width / 2) * (0xff / width) );
			view[p] = v < 0 ? 0 : ( v < 0xff ? v : 0xff );
			p++;
		}
		this.data = data;
		this.view = view;
		this.read = ( offset ) => this.view[ offset ];
		this.write = ( offset, value ) => this.view[ offset ] = value;
	}
	/**
	 * xi {integer}
	 * yi {integer}
	 */
	public getPixelAt( xi, yi ){
		return this.read( yi * this.width + xi );
	}
	public writePixelAt( xi, yi, value ){
		return this.write( yi * this.width + xi, value );
	}
	
	constructor( width: number, height: number, type: PixelFormat, data?: ArrayBuffer ){
		let pxInfo = pixelFormatInfo(type);

		this.width = width;
		this.height = height;
		this.data = data ? data : new ArrayBuffer( width * height * pxInfo.bpp );
		
		this.view = new pxInfo.arrayClass( this.data );
		if( type !== PixelFormat.Binary ){
			this.read = (offset) => this.view[offset];
			this.write = (offset,value) => this.view[offset] = value;
		}else{
			this.read = (offset) => (this.view[offset >> 3] >> (7 - offset % 8)) & 1;
			this.write = (offset, value) => {
				let cur = this.view[offset >> 3];//offset => offset/8
				cur ^= (-value ^ cur) & (1 << (7 - offset % 8)); // set n-th bit to value
				this.view[offset >> 3] = cur;
			};
		}
	}
	
}