'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { EventEmitter } from 'events';

import { VoxelCloud }					from '../../../common/VoxelCloud';
import { CrossSection }					from '../../../browser/interface/cross-section';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';
import { Viewer }						from '../../../browser/viewer/viewer';
import { CrossSectionUtil }				from '../../../browser/util/cross-section-util';


type Vector3D = [number, number, number];

export default class CloudEditorDynamic {
	
	public cloud: VoxelCloud;
	public section: CrossSection;
	public viewport: [ number, number ];
	
	private drawing: boolean;
	
	public penWidthVoxel: number = 10.0;
	
	private mapper;

	private ex: number;
	private ey: number;
	private nibs = [0,0,0];
	
	constructor(){
		this.drawing = false;
	}
	
	public prepare( section, viewport ){
		this.section = section;
		this.viewport = viewport;
		this.mapper = CrossSectionUtil.getPixelToVoxelMapper( this.section, this.viewport );
	}
	
	public isReady(){
		return this.cloud && this.section && this.viewport;
	}
	
	public penDown( ex, ey ){
		if( this.isReady() && !this.drawing ){
			this.drawing = true;
			this.moveTo( ex, ey );
			this.lineTo( ex, ey );
			return true;
		}else{
			return false;
		}
	}
	public penMove( ex, ey ){
		if( this.drawing ){
			this.lineTo( ex, ey );
			return true;
		}else{
			return false;
		}
	}
	public penUp( ex, ey ){
		if( this.drawing ){
			this.drawing = false;
			return true;
		}else{
			return false;
		}
	}
	
	private getNibs( ix, iy, penWidth: number ){

		let o1 = this.mapper( ix, iy );
		let o2 = this.mapper( ix+1, iy+1 );
		let o = [
			( o1[0] + o2[0] ) / 2,
			( o1[1] + o2[1] ) / 2,
			( o1[2] + o2[2] ) / 2,
		];
		
		// 座標系
		let uMax = Math.max( this.section.xAxis[0], this.section.xAxis[1], this.section.xAxis[2] );
		let eu = vec3.scale( vec3.create(), this.section.xAxis, 1 / uMax );
		
		let vMax = Math.max( this.section.yAxis[0], this.section.yAxis[1], this.section.yAxis[2] );
		let ev = vec3.scale( vec3.create(), this.section.yAxis, 1 / vMax );
		
		// 塗りつぶし領域
		let po = [ // 左上端点を含む座標
			o[0] - ( eu[0] + ev[0] ) * penWidth / 2,
			o[1] - ( eu[1] + ev[1] ) * penWidth / 2,
			o[2] - ( eu[2] + ev[2] ) * penWidth / 2 ];
		let px = vec3.add( vec3.create(), o, vec3.scale( vec3.create(), eu, penWidth / 2  ) ); // x方向
		let py = vec3.add( vec3.create(), o, vec3.scale( vec3.create(), ev, penWidth / 2  ) ); // y方向
		let pe = vec3.add( vec3.create(), px, vec3.scale( vec3.create(), ev, penWidth / 2 ) ); // xy方向
		
		let v0 = [
			Math.min( po[0], px[0], py[0], pe[0] ),
			Math.min( po[1], px[1], py[1], pe[1] ),
			Math.min( po[2], px[2], py[2], pe[2] )
		];
		let v1 = [
			Math.max( po[0], px[0], py[0], pe[0] ),
			Math.max( po[1], px[1], py[1], pe[1] ),
			Math.max( po[2], px[2], py[2], pe[2] )
		];
		
		let nibs = [];
		let v = vec3.clone( v0 );
		while( v[0] <= v1[0] ){
			v[1] = v0[1];
			while( v[1] <= v1[1] ){
				v[2] = v0[2];
				while( v[2] <= v1[2] ){
					nibs.push( [ Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2]) ] );
					v[2]++;
				}
				v[1]++;
			}
			v[0]++;
		}
		return nibs;
	}
	
	private moveTo( ex, ey ){
		this.ex = ex;
		this.ey = ey;
		this.nibs = this.getNibs( ex, ey,  this.penWidthVoxel );
	}
	
	private lineTo( ex, ey ){
		let startPoint = this.mapper( this.ex, this.ey ).map( (i) => Math.floor(i) );
		let endPoint = this.mapper( ex, ey ).map( (i) => Math.floor(i) );
		
		let dx = endPoint[0] - startPoint[0];
		let dy = endPoint[1] - startPoint[1];
		let dz = endPoint[2] - startPoint[2];
		
		let count = Math.max( Math.abs(dx), Math.abs(dy), Math.abs(dz) );
		let step = [ dx / count, dy / count, dz / count ];
		
		// console.log( 'startPoint: '+ startPoint.toString() );
		// console.log( 'endPoint: '+ endPoint.toString() );
		// console.log( 'count: ' + count.toString() );
		// console.log( 'step: ' + step.toString() );
		// console.log( 'nibs(' + this.nibs.length.toString() + '): ' + this.nibs.map( (i) => '[' + i.toString() + ']' ).join(' , ') );
		
		for( let n = 0; n < this.nibs.length; n++ ){
			let p = this.nibs[n];
			let px = p[0], py = p[1], pz = p[2];
			
			if( count === 0 ){
				this.cloud.writePixelAt( 1, Math.floor(px), Math.floor(py), Math.floor(pz) );
			}else{
				for( let i = 0; i <= count; i++ ){
					this.cloud.writePixelAt( 1, Math.floor(px), Math.floor(py), Math.floor(pz) );
					px+=step[0];
					py+=step[1];
					pz+=step[2];
				}
			}
		}
		this.moveTo( ex, ey );
	}
	
	public applyImage( imageData ) {
		
		if( !this.isReady() ) return;
		
		let vpw = imageData.width, vph = imageData.height;
		let image = imageData.data;
		
		let imageOffset = 0;
		for( let iy = 0; iy < vph; iy++ ){
			for( let ix = 0; ix < vpw; ix++ ){
				let alpha = image[ ( imageOffset << 2 ) + 3 ];
				if( alpha > 0 ){
					// console.log( '[ '+[ix,iy].toString() + ' ]' + ' #'+ imageOffset.toString() );
					this.applyCanvasDot( ix, iy );
				}
				imageOffset++;
			}
		}
	}
	
	/**
	 * canvas上の1点( ix, iy )が示す領域に対応する全てのボクセルを塗る
	 */
	private applyCanvasDot( ix,iy ){

		if( !this.isReady() ) return;
		
		let po = this.mapper( ix, iy ); // 左上端点を含む座標
		this.cloud.writePixelAt( 1, Math.floor(po[0]), Math.floor(po[1]), Math.floor(po[2]) );
		
		let px = this.mapper( ix+1, iy ); // x方向
		let py = this.mapper( ix, iy+1 ); // y方向
		let pe = this.mapper( ix+1, iy+1 ); // xy方向
		
		let v0 = [
			Math.min( po[0], px[0], py[0], pe[0] ),
			Math.min( po[1], px[1], py[1], pe[1] ),
			Math.min( po[2], px[2], py[2], pe[2] )
		];
		let v1 = [
			Math.max( po[0], px[0], py[0], pe[0] ),
			Math.max( po[1], px[1], py[1], pe[1] ),
			Math.max( po[2], px[2], py[2], pe[2] )
		];
		
		let v = vec3.clone( v0 );
		while( v[0] <= v1[0] ){
			v[1] = v0[1];
			while( v[1] <= v1[1] ){
				v[2] = v0[2];
				while( v[2] <= v1[2] ){
					this.cloud.writePixelAt( 1, Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2]) );
					// console.log( vec3.str( [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])] ) );
					v[2]++;
				}
				v[1]++;
			}
			v[0]++;
		}
	}
}
