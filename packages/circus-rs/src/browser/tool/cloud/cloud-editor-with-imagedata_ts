'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { EventEmitter } from 'events'

import { VoxelCloud }					from '../../../common/VoxelCloud';

import { Viewer }						from '../../../browser/viewer/viewer';
import { ViewerEvent }					from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';
import { CrossSection }					from '../../../browser/interface/cross-section';
import { CrossSectionUtil }				from '../../../browser/util/cross-section-util';

type Vector3D = [number, number, number];
type Vector2D = [number, number];

export default class CloudEditorWithImageData extends EventEmitter implements ViewerEventTarget {
	
	public cloud: VoxelCloud;
	public section;
	public viewport;
	
	public flushOnMouseup: boolean = true;
	
	private drawing: boolean;
	
	public color: string = 'rgba(255,0,0,0.7)';
	public canvasPenWidth: number = 1.0;
	
	public drawingImageData: any; // :ImageData
	private mapper;

	private context;
	private backCanvas;
	private backContext;

	private ex: number;
	private ey: number;
	
	constructor( cloud, section, viewport ){
		super();
		
		this.cloud = cloud;
		this.section = section;
		this.viewport = viewport;
		
		this.drawing = false;
		
		this.backCanvas = this.createBackCanvas( viewport[0], viewport[1] );
		this.backContext = this.backCanvas.getContext('2d');
		this.resetBackCanvas();
	}
	
	public penDown( ex, ey ){
		if( !this.drawing ){
			this.drawing = true;
			this.mapper = CrossSectionUtil.getPixelToVoxelMapper( this.section, this.viewport );

			// draw front
			if( this.flushOnMouseup ){
				this.context.save();
				this.context.beginPath();
				this.context.moveTo( ex, ey );
				this.context.strokeStyle = this.color;
				this.context.lineWidth = this.canvasPenWidth;
				this.context.rect( ex, ey, 1, 1 );
				this.context.stroke();
			}

			// draw back
			this.backContext.beginPath();
			this.backContext.moveTo( ex, ey );
			this.backContext.strokeStyle = this.color;
			this.backContext.lineWidth = this.canvasPenWidth;
			this.backContext.rect( ex, ey, 1, 1 );
			this.backContext.stroke();

			return true;
		}else{
			return false;
		}
	}
	
	public penMove( ex, ey ){
		if( this.drawing ){
			
			// draw front
			if( this.flushOnMouseup ){
				this.context.lineTo( ex,ey );
				this.context.stroke();
			}else{
				let drawImage = this.backContext.getImageData( 0, 0, this.viewport[0], this.viewport[1] );
				this.applyImage( drawImage );
			}

			// draw back
			this.backContext.lineTo( ex,ey );
			this.backContext.stroke();

			return true;
		}else{
			return false;
		}
	}
	public penUp( ex, ey ){
		if( this.drawing ){
			this.drawing = false;
			
			// restore front
			if( this.flushOnMouseup ){
				this.context.restore();
			}
			
			// create image data and it apply to cloud
			if( this.flushOnMouseup ){
				let drawImage = this.backContext.getImageData( 0, 0, this.viewport[0], this.viewport[1] );
				this.applyImage( drawImage );
			}
			
			this.resetBackCanvas();
			
			return true;
		}else{
			return false;
		}
	}
	
	/**
	 * back canvas
	 */
	private createBackCanvas( width: number, height: number ){
		let backCanvas = document.createElement('canvas');
		backCanvas.setAttribute('width', width.toString() );
		backCanvas.setAttribute('height', height.toString() );
		
		backCanvas.style.position = 'fixed';
		backCanvas.style.right = '0';
		backCanvas.style.top = '0';
		( document.getElementsByTagName('body') )[0].appendChild( backCanvas );
		
		return backCanvas;
	}
	private resetBackCanvas(){
		this.backContext.clearRect( 0, 0, this.viewport[0], this.viewport[1] );
	}
	private removeBackCanvas(){
		this.backContext = null;
		this.backCanvas.parentNode.removeChild( this.backCanvas );
	}

	/**
	 * handle cloud
	 */
	public applyImage( imageData ) {

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

		let mapper = CrossSectionUtil.getPixelToVoxelMapper( this.section, this.viewport );
		// 塗りつぶし領域
		let po = mapper( ix, iy ); // 左上端点を含む座標
		this.cloud.writePixelAt( 1, Math.floor(po[0]), Math.floor(po[1]), Math.floor(po[2]) );
		
		let px = mapper( ix+1, iy ); // x方向
		let py = mapper( ix, iy+1 ); // y方向
		let pe = mapper( ix+1, iy+1 ); // xy方向
		
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
	
	/**
	 * implements ViewerEventTarget
	 */
	
	public mousedownHandler( ev: ViewerEvent ){

		this.context = ev.viewer.canvasDomElement.getContext('2d');

		if( this.penDown( ev.viewerX, ev.viewerY ) ){
			ev.stopPropagation();
			ev.viewer.primaryEventTarget = this;
			if( ! this.flushOnMouseup ) ev.viewer.render();
		}
	}

	public mousemoveHandler( e: ViewerEvent ){
		e.stopPropagation();
		if( this.penMove( e.viewerX, e.viewerY ) ){
			if( ! this.flushOnMouseup ) e.viewer.render();
		}
	}
	
	public mouseupHandler( e: ViewerEvent ){
		e.stopPropagation();
		if( this.penUp( e.viewerX, e.viewerY ) ){
			e.viewer.primaryEventTarget = null;
			e.viewer.render();
			this.emit( 'penup', this.cloud ); // for history ? 
		}
	}
	
	public mousewheelHandler( ev: ViewerEvent ){
		return;
	}
	
}

export class ImageDataUtil {
	
	public static diff( imageData, image1, image2 ){
		
		let width = image1.width;
		let height = image1.height;
		let image = image1.data;
		let background = image2.data;
		
		let srcidx = 0, pixel, dstidx;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				dstidx = srcidx << 2; // meaning multiply 4
				if(
					image[dstidx] !== background[dstidx]
					|| image[dstidx+1] !== background[dstidx+1]
					|| image[dstidx+2] !== background[dstidx+2]
					|| image[dstidx+3] !== background[dstidx+3]
				){
					imageData.data[dstidx] = image[dstidx];
					imageData.data[dstidx + 1] = image[dstidx+1];
					imageData.data[dstidx + 2] = image[dstidx+2];
					imageData.data[dstidx + 3] = image[dstidx+3];
				}
				srcidx++;
			}
		}
	}
	
	public dot( imageData, x: number, y: number, r: number, g :number, b: number, a: number ){

		let dstidx = imageData.width * y + x;
		
		imageData.data[dstidx] = r;
		imageData.data[dstidx + 1] = g;
		imageData.data[dstidx + 2] = b;
		imageData.data[dstidx + 3] = a;
	}
	
	
}


