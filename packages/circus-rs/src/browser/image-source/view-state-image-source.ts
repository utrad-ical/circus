'use strict';

var {mat4, vec3} = require('gl-matrix');
import { ImageSource } from '../image-source';

type Vector3 = [number,number,number];

export class ViewStateImageSource extends ImageSource {

	private width: number;
	private height: number;
	private depth: number;
	private scale: number;

	private matrix;
	
	constructor( width: number, height: number, depth: number ){
		super();
		this.width = width;
		this.height = height;
		this.depth = depth;
		this.scale = 0.5;
	}
	
	public readyCoordinatesMapper(
		viewState,
		mvTranslate: Vector3 = [-1.0, -2.0, -1.0],
		eye: Vector3 = [1.0, 2.0, 1.0],
		lookAt: Vector3 = [0.0, 0.0, 0.0],
		up: Vector3 = [0.0, 0.0, -1.0]
	){
		let max = Math.max( this.width, this.height, this.depth );
	
		let preTransMat = mat4.create();
		mat4.scale( preTransMat, preTransMat, [1/max,1/max,1/max] );
		mat4.translate( preTransMat, preTransMat, [ this.width * -0.5, this.height * -0.5, this.depth * -0.5] );
	
		let canvasSize = viewState.getSize();
		let mvMat = mat4.translate( mat4.create(), mat4.create(), mvTranslate );
		let viewMat = mat4.lookAt( mat4.create(), eye, lookAt, up );
		let pMat = mat4.perspective(mat4.create(), 40.0 / 180.0 * Math.PI, canvasSize[0] / canvasSize[1], 0.1, 100.0);
		let cxMat = mat4.multiply( mat4.create(), pMat, mat4.multiply( mat4.create(), viewMat, mvMat ) );
		
		let postTransMat = mat4.scale( mat4.create(), mat4.create(), [max,max,max] );
		
		this.matrix = mat4.create();
		mat4.multiply( this.matrix, this.matrix, postTransMat );
		mat4.multiply( this.matrix, this.matrix, cxMat );
		mat4.multiply( this.matrix, this.matrix, preTransMat );
		
		let center = vec3.scale( vec3.create(), [this.width, this.height, this.depth ], 0.5 );
		let center2 = vec3.transformMat4( vec3.create(), center, this.matrix ).map( i => Math.round(i) );
		let move = mat4.translate( mat4.create(), mat4.create(), vec3.subtract( vec3.create(), center, center2 ) );
		mat4.multiply( this.matrix, move, this.matrix );
		
	}
	
	public getCoordinates( p ){
		return vec3.transformMat4( vec3.create(), p, this.matrix ).map( i => Math.round(i) );
	}
	
	/**
	 * Draw view state information text
	 */
	public draw( canvasDomElement, viewState ):Promise<any> {
		
		let context = canvasDomElement.getContext("2d");
		
		this.readyCoordinatesMapper(viewState);
		
		
		/**
		 * Draw volume box
		 */
		let [ cA1,cA2,cA3,cA4,cB1,cB2,cB3,cB4 ] = [ 
			[0,0,0],[this.width, 0, 0],[this.width, this.height, 0],[0, this.height, 0],
			[0,0, this.depth],[this.width, 0, this.depth],[this.width, this.height, this.depth],[0, this.height, this.depth ]
		].map( p => this.getCoordinates( p ) );
		
		this.strokePolygone( context, [cA1,cA2,cA3,cA4,cA1,cB1,cB2,cA2,cA1], 1.0, 'rgb(0, 32, 128)' );
		this.strokePolygone( context, [cB3,cB2,cB1,cB4,cB3,cA3,cA4,cB4,cB3], 1.0, 'rgb(0, 32, 128)' );
		
		
		/**
		 * Draw viewport
		 */
		let vp = [
			viewState.getLeftTop(),
			viewState.getRightTop(),
			viewState.getRightBottom(),
			viewState.getLeftBottom()
		].map( p => this.getCoordinates( p ) );
		
		this.fillPolygone( context, vp, 'rgba( 128, 128, 128, 0.2 )' );
		
		/**
		 * Draw axis
		 */
		
		// X axis
		let xAxisArrow = [ viewState.getLeftTop(),viewState.getRightTop() ].map( p => this.getCoordinates( p ) );
		this.strokePolygone( context, xAxisArrow, 3.0, 'rgba( 0, 255, 96, 1.0 )' );
		// Surface in XY plane
		this.fillPolygone( context, [cA1,cA2,cB2,cB1,cA1],'rgba( 0, 255, 96, 0.1 )' );
		
		// Y axis
		let yAxisArrow = [ viewState.getLeftTop(),viewState.getLeftBottom() ].map( p => this.getCoordinates( p ) );
		this.strokePolygone( context, yAxisArrow, 3.0, 'rgba( 0, 96, 255, 1.0 )' );
		// Surface in YZ plane
		this.fillPolygone( context, [cA1,cA4,cB4,cB1,cA1], 'rgba( 0, 96, 255, 0.1 )' );
		
		/**
		 * Draw origin
		 */
		let origin = this.getCoordinates( viewState.getOrigin() );
		this.strokeCircle( context, [ origin[0],origin[1] ], 3, 'rgba( 255, 96, 0, 0.7 )');

		/**
		 * Draw marker sample
		 */
		let p100x100x64 = [100,100,64];
		let marker = this.getCoordinates( p100x100x64 );
		this.strokeCircle( context, [ marker[0],marker[1] ], 5, 'rgba( 96, 0, 255, 1 )');
		let markerGuide = [
			p100x100x64,
			[ p100x100x64[0],p100x100x64[1],0 ],
			p100x100x64,
			[ p100x100x64[0],0,p100x100x64[2] ],
			p100x100x64,
			[ 0, p100x100x64[1],p100x100x64[2] ],
			p100x100x64
		].map( p => {
			let [x,y] = this.getCoordinates( p );
			return [x,y];
		} );
		this.strokePolygone( context, markerGuide, 0.5, 'rgba( 96, 0, 255, 1 )');

		/**
		 * Draw status text
		 */
		var x = 30;
		var y = 20;
		var lineHeight = 24;
		var k = 100;
		
		context.font = "14pt Arial";
		context.fillStyle = 'rgba(255,0,0,1.0)';
		// console.log( this.vecToString( viewState.getOrigin(), 100 ) );

		context.fillText( 'Origin: ' + this.vecToString( viewState.getOrigin(), 100 ),
			x,y+=lineHeight);

		context.fillStyle = 'rgba( 0, 255, 96, 1.0 )';
		context.fillText( 'VectorX: '+ Math.round( vec3.length(viewState.getVectorX()) ) + ' ' + this.vecToString( viewState.getVectorX(), 100 ),
			x,y+=lineHeight);
			
		context.fillStyle = 'rgba( 0, 96, 255, 1.0 )';
		context.fillText( 'VectorY: '+ Math.round( vec3.length(viewState.getVectorY()) ) + ' ' + this.vecToString( viewState.getVectorY(), 100 ),
			x,y+=lineHeight);

		context.fillStyle = 'rgb(0, 0, 0)';
		context.fillText( 'Center: ' + this.vecToString( viewState.getCenter(), 100 ),
			x,y+=lineHeight);
		context.fillText( 'NV: ' + this.vecToString( viewState.getNormalVector(), 100 ),
			x,y+=lineHeight);
		
		return Promise.resolve();
	}
	
	private vecToString( v, k ): string {
		let s: [string,string,string] = ['','',''];
		s[0] = ( Math.round( v[0] * k ) / k ).toString();
		s[1] = ( Math.round( v[1] * k ) / k ).toString();
		s[2] = ( Math.round( v[2] * k ) / k ).toString();
		return '[' + s.join(',') + ']';
	}
	
	public strokeCircle( context, center: [number,number], radius: number = 10, color: string = 'rgba( 255, 0, 0, 1.0 )' ){
		context.beginPath();
		context.arc( center[0], center[1], radius, 0, Math.PI * 2 );
		context.closePath();
		context.fillStyle = color;
		context.fill();
	}
	private fillPolygone( context, path, color: string = 'rgba(0,255,0,0.2)' ){
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		path.reduce( (p,n) => { context.lineTo(n[0],n[1]); return n; }, path.shift() );
		context.closePath();
		context.fillStyle = color;
		context.fill();
	}
	private strokePolygone( context, path, width: number = 1.0, color: string = 'rgba(0,255,0,0.2)' ){
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		path.reduce( (p,n) => { context.lineTo(n[0],n[1]); return n; }, path.shift() );
		context.closePath();
		context.lineWidth = 1.0;
		context.strokeStyle = color;
		context.stroke();
	}

}
