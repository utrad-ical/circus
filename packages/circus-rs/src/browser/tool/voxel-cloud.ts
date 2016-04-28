'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool } from './tool'
import { Viewer } from '../viewer'
import { ViewerEvent } from '../viewer-event'
import { ViewerEventTarget } from '../viewer-event-target'
import { CrossSection } from '../cross-section'
import { Vertex } from '../vertex'
import { VoxelCloud } from '../../common/VoxelCloud'

type Vector3D = [number, number, number];

export class VoxelCloudTool extends Tool implements ViewerEventTarget {
	
	private mode: string;
	private drag: boolean;
	private voxelCloud;

	private backCanvas;
//	private viewer;	
	private penStrokePoint: any[];
	public penWidth: number = 1.0;
	public color: string = 'rgba(255,0,0,0.7)';
	

	constructor(){
		super();
		this.drag = false;
		this.penStrokePoint = [];
		
		this.on('focus', ( viewer )=>{
			viewer.backgroundEventTarget = this;
		});
	}
	public getBackContext( width, height ){
		
		if( this.backCanvas ){
			let c = this.backCanvas.getContext('2d');
			c.clearRect( 0, 0, this.backCanvas.getAttribute('width'), this.backCanvas.getAttribute('height') );
			return c;
		};
		
		this.backCanvas = document.createElement('canvas');
		this.backCanvas.setAttribute('width', width.toString());
		this.backCanvas.setAttribute('height', height.toString());
		
		this.backCanvas.style.position = 'fixed';
		this.backCanvas.style.right = '0';
		this.backCanvas.style.top = '0';
		( document.getElementsByTagName('body') )[0].appendChild( this.backCanvas );
		
		return this.backCanvas.getContext('2d');
	}
	
	public drawPenStroke( context, strokePoints ){
		if( strokePoints.length > 0 ){
			
			context.save();
			context.beginPath();
			context.lineWidth = this.penWidth;
			context.strokeStyle = this.color;

			let o = strokePoints[0];
			context.moveTo( o[0], o[1] );
			strokePoints.forEach( p => {
				context.lineTo( p[0], p[1] );
			} );

			context.stroke();
			context.restore();
		}
	}
	
	public mousedownHandler(ev: ViewerEvent) {
		if( ! this.drag ){
			this.drag = true;
			ev.viewer.primaryEventTarget = this;
			
			// pen start
			this.penStrokePoint.push( [ev.original.offsetX, ev.original.offsetY] );
			this.drawPenStroke( ev.original.target.getContext('2d'), this.penStrokePoint );
			
			// ev.viewer.emit( 'checkstate', { dot: [ ev.original.offsetX, ev.original.offsetY ] } );
		}
		ev.stopPropagation();
	}
	public mousemoveHandler(ev: ViewerEvent) {
		if( this.drag ){
			// pen drawing
			this.penStrokePoint.push( [ev.original.offsetX, ev.original.offsetY] );
			
			if( this.penStrokePoint.length > 1 ){
				let prev = this.penStrokePoint[this.penStrokePoint.length-2];
				let cur = this.penStrokePoint[this.penStrokePoint.length-1];
				this.drawPenStroke( ev.original.target.getContext('2d'), [prev,cur] );
			}
		}
		ev.stopPropagation();
	}
	
	public mouseupHandler(ev: ViewerEvent) {
		if( this.drag ){
			
			let viewState = ev.viewer.viewState;
			let viewport = [
				parseInt( ev.original.target.getAttribute('width') ),
				parseInt( ev.original.target.getAttribute('height') )
			];
			
			if( this.penStrokePoint.length > 0 ){
				let context = this.getBackContext( viewport[0], viewport[1] );
				
				// draw pen
				this.drawPenStroke( context, this.penStrokePoint );
				this.penStrokePoint = [];
			
				let slice = context.getImageData( 0, 0, viewport[0], viewport[1] );
				this.addSlice( viewState.section, slice );
			}
			
			// // 表示チェック
			if( this.voxelCloud ){
				let slice = this.getSlice( viewState.section, viewport );
				if( slice ){
					let frontContext = ev.original.target.getContext('2d');
					frontContext.putImageData( slice.image, slice.offset[0], slice.offset[1] );
				}
			}
			
			this.drag = false;
			ev.viewer.primaryEventTarget = null;
			// ev.viewer.render();
		}
		ev.stopPropagation();
	}
	
	public addSlice( section, slice ){
		
		let sectionCloud = this.createSliceCloud( section, slice );
		
		this.voxelCloud = this.voxelCloud
			? VoxelCloud.combine( this.voxelCloud, sectionCloud )
			: VoxelCloud.combine( sectionCloud ); // to fit size
		
	}
	public getSlice( section, viewport ){

		let voxelCloud = this.voxelCloud; 
		
		let matrix = CrossSection.getVoxelMapperMatrix( section, viewport );
		let inverse = mat4.invert( mat4.create(), matrix );
		let toVoxelCoord = function(x,y,z=0){
			let p = vec3.fromValues( x, y, z );
			vec3.transformMat4( p, p, matrix );
			return p;
		};
		let toCanvasCoord = function(x,y,z){
			let p = vec3.fromValues( x, y, z );
			vec3.transformMat4( p, p, inverse );
			return p;
		};
		
		let check = { left: false, right: false, top: false, bottom: false, front: false, back:false };
		let vp = [ [ Infinity, Infinity ], [ -Infinity, -Infinity ] ];
		let bound = Vertex.rectangular( voxelCloud.getDimension(), voxelCloud.offset ).map( i => {
			let p = toCanvasCoord( i[0], i[1], i[2] );
			check.left = check.left || 0 <= p[0];
			check.right = check.right || p[0] <= viewport[0];
			check.top = check.top || 0 <= p[1];
			check.bottom = check.bottom || p[1] <= viewport[1];
			check.front = check.front || 0 <= p[2];
			check.back = check.back || p[2] <= 0;
			
			vp[0][0] = Math.min( vp[0][0], p[0] );
			vp[0][1] = Math.min( vp[0][1], p[1] );
			vp[1][0] = Math.max( vp[1][0], p[0] );
			vp[1][1] = Math.max( vp[1][1], p[1] );
			return p;
		} );
		
		if( check.left && check.right && check.top && check.bottom && check.front && check.back ){
			vp[0][0] = Math.floor( Math.max( 0, vp[0][0] ) );
			vp[0][1] = Math.floor( Math.max( 0, vp[0][1] ) );
			vp[1][0] = Math.ceil( Math.min( viewport[0], vp[1][0] ) );
			vp[1][1] = Math.ceil( Math.min( viewport[1], vp[1][1] ) );
			
			let scanSize = [ vp[1][0]-vp[0][0] , vp[1][1]-vp[0][1] ];
			
			let scanSection = {
				origin: toVoxelCoord( vp[0][0], vp[0][1] ),
				xAxis: vec3.subtract( vec3.create(), toVoxelCoord( vp[1][0], vp[1][1] ), toVoxelCoord( vp[0][0], vp[1][1] ) ),
				yAxis: vec3.subtract( vec3.create(), toVoxelCoord( vp[1][0], vp[1][1] ), toVoxelCoord( vp[1][0], vp[0][1] ) )
			};
			
			let image = document.createElement('canvas').getContext('2d').createImageData( scanSize[0], scanSize[1] );
			this.voxelCloud.scanCrossSection(
				scanSection.origin,
				vec3.scale( vec3.create(), scanSection.xAxis , 1 / scanSize[0] ),
				vec3.scale( vec3.create(), scanSection.yAxis , 1 / scanSize[1] ),
				scanSize,
				image.data
			);
			
			return {
				offset: vp[0],
				image: image
			};
		}else{
			return null;
		}
	}
	
	public createSliceCloud( section, slice ) {
		
		let raw = new VoxelCloud();
		
		let min = [ Infinity, Infinity, Infinity ],
			max = [ -Infinity, -Infinity, -Infinity ];

		CrossSection.vertex( section ).forEach( v => {
			min = [0,1,2].map( i => Math.min( min[i], v[i] ) );
			max = [0,1,2].map( i => Math.max( max[i], v[i] ) );
		} );
		
		let dimension = [0,1,2].map( i=> Math.ceil( (max[i]-min[i]+1) / 8 ) * 8 );
		
		raw.setDimension( dimension[0], dimension[1], dimension[2] );
		raw.offset = min as Vector3D;
		raw.dimensionOffset = [0,0,0] as Vector3D;
		raw.dimensionActiveRange = dimension as Vector3D;
		
		let uStep = Math.ceil( Math.max( Math.abs( section.xAxis[0] ), Math.abs( section.xAxis[1] ), Math.abs( section.xAxis[2] ) ) );
		let vStep = Math.ceil( Math.max( Math.abs( section.yAxis[0] ), Math.abs( section.yAxis[1] ), Math.abs( section.yAxis[2] ) ) );
		
		let du = vec3.scale( vec3.create(), section.xAxis, 1.0 / uStep );
		let dv = vec3.scale( vec3.create(), section.yAxis, 1.0 / vStep );
		
		let dcx = slice.width / uStep;
		let dcy = slice.height / vStep;

		console.log('*** u ***');
		console.log( section.xAxis );
		console.log( uStep );
		console.log( du );
		console.log( dcx );
		console.log('*** v ***');
		console.log( section.yAxis );
		console.log( vStep );
		console.log( dv );
		console.log( dcy );
		
		min = [ Infinity, Infinity, Infinity ],
		max = [ -Infinity, -Infinity, -Infinity ];
		let sx,sy;
		let cx = 0, cy = 0, srcidx, pixel;
		let pv, pu, pi;
		pv = vec3.subtract( vec3.create(), section.origin ,raw.offset );
		for( sy = 0; sy < vStep; sy++ ){
			pu = vec3.clone(pv);
			cx = 0;
			for( sx = 0; sx < uStep; sx++ ){
				srcidx = ( Math.floor(cx) + Math.floor(cy) * slice.width ) << 2;
				pixel = slice.data[srcidx] + slice.data[srcidx+1] +  slice.data[srcidx+2];
				if( pixel > 0 ){
					pi = pu.map( i => Math.floor(i) );
					raw.writePixelAt( 1, pi[0], pi[1], pi[2] );
					
					// pixelが塗られている確率はそれほど高くないはずので ... 
					if( max[0] < pi[0] ) max[0] = pi[0];
					if( max[1] < pi[1] ) max[1] = pi[1];
					if( max[2] < pi[2] ) max[2] = pi[2];
					if( min[0] > pi[0] ) min[0] = pi[0];
					if( min[1] > pi[1] ) min[1] = pi[1];
					if( min[2] > pi[2] ) min[2] = pi[2];
				}
				vec3.add( pu, pu, du );
				cx += dcx;
			}
			vec3.add( pv, pv, dv );
			cy += dcy;
		}
		raw.dimensionOffset = min as Vector3D;
		raw.dimensionActiveRange = vec3.subtract( vec3.create(), max, min ) as Vector3D;
		
		return raw;
	}
	
	public mousewheelHandler(ev: ViewerEvent) {
		
		let viewState = ev.viewer.viewState;
		let nv = vec3.create();
			
		vec3.cross( nv, viewState.section.xAxis, viewState.section.yAxis );
		vec3.normalize( nv, nv );
		if( ev.original.deltaY > 0 ) vec3.scale( nv, nv, -1 );
		
		vec3.add( viewState.section.origin, viewState.section.origin, nv );
		ev.viewer.render();
		ev.stopPropagation();
	}
	
	
}
