'use strict';

var {mat4, vec3} = require('gl-matrix');
import { ImageSource } from '../image-source';

type Vector3 = [number,number,number];
type Point3 = [number,number,number];

export class VolumeViewStateImageSource extends ImageSource {

	private width: number;
	private height: number;
	private depth: number;

	private matrix;
	private canvasSizeCache;
	
	public eye: Point3 = [1.0, 2.0, 1.0];
	public focus: Point3 = [0.0, 0.0, 0.0];
	public up: Vector3 = [0.0, 0.0, -1.0];
	
	constructor( width: number, height: number, depth: number ){
		super();
		this.width = width;
		this.height = height;
		this.depth = depth;
	}
	
	public readyCoordinatesMapper(
		canvasSize
	){

		let worldSize = Math.max( this.width, this.height, this.depth );
	
		let model = mat4.create();
		mat4.scale( model, model, [0.8,0.8,0.8] );
		mat4.scale( model, model, [1/worldSize,1/worldSize,1/worldSize] );
		mat4.translate( model, model, [ this.width * -0.5, this.height * -0.5, this.depth * -0.5] );

		let view = mat4.lookAt( mat4.create(), this.eye, this.focus, this.up );
		let projection = mat4.perspective(mat4.create(), 40.0 / 180.0 * Math.PI, canvasSize[0] / canvasSize[1], 0.1, 100.0);
		let screen =  [
			canvasSize[0] / 2, 0, 0, 0,
			0, canvasSize[1] / 2, 0, 0,
			0, 0, 1, 0,
			canvasSize[0] / 2, canvasSize[1] / 2, 0, 1
		];
		
		let matrix = mat4.create();
		mat4.multiply( matrix, model, matrix );
		mat4.multiply( matrix, view, matrix );
		mat4.multiply( matrix, projection, matrix );
		mat4.multiply( matrix, screen, matrix );
		this.matrix = matrix;
	}

	public getCoordinates( p ){
		return vec3.transformMat4( vec3.create(), p, this.matrix ).map( i => Math.round(i) );
	}
	
	/**
	 * Draw view state information text
	 */
	public draw( canvasDomElement, viewState ):Promise<any> {
		
		let context = canvasDomElement.getContext("2d");
		let canvasSize = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ];
		this.readyCoordinatesMapper( canvasSize );
		
		/**
		 * Draw volume box
		 */
		
		let boxCorner = [ 
			[0,0,0],[this.width, 0, 0],[this.width, this.height, 0],[0, this.height, 0],
			[0,0, this.depth],[this.width, 0, this.depth],[this.width, this.height, this.depth],[0, this.height, this.depth ]
		];
		
		let [ cA1,cA2,cA3,cA4,cB1,cB2,cB3,cB4 ] = boxCorner.map( p => this.getCoordinates( p ) );
		this.strokePolygone( context, [cA1,cA2,cA3,cA4,cA1,cB1,cB2,cA2,cA1], 1.0, 'rgb(0, 32, 128)' );
		this.strokePolygone( context, [cB3,cB2,cB1,cB4,cB3,cA3,cA4,cB4,cB3], 1.0, 'rgb(0, 32, 128)' );

		// Surface in XY plane
		this.fillPolygone( context, [cA1,cA2,cB2,cB1,cA1],'rgba( 0, 255, 96, 0.1 )' );
		// Surface in YZ plane
		this.fillPolygone( context, [cA1,cA4,cB4,cB1,cA1], 'rgba( 0, 96, 255, 0.1 )' );
		
		
		/**
		 * Draw cross section rectangle
		 */
		let vertexes = [
			vec3.clone( viewState.origin ),
			vec3.create(),
			vec3.create(),
			vec3.create()
		];
		vec3.add( vertexes[1], vertexes[0], viewState.xAxis );
		vec3.add( vertexes[2], vertexes[1], viewState.yAxis );
		vec3.add( vertexes[3], vertexes[0], viewState.yAxis );
		vertexes = vertexes.map( v => this.getCoordinates( v ) );
		
		// plane
		this.fillPolygone( context, vertexes, 'rgba( 128, 128, 128, 0.2 )' );
		
		// X axis
		this.strokePolygone( context, [ vertexes[0],vertexes[1] ], 3.0, 'rgba( 0, 255, 96, 1.0 )' );
		
		// Y axis
		this.strokePolygone( context, [ vertexes[0],vertexes[3] ] , 3.0, 'rgba( 0, 96, 255, 1.0 )' );
		
		// origin
		this.fillCircle( context, vertexes[0], 3, 'rgba( 255, 96, 0, 0.7 )');

		/**
		 * Draw status text
		 */
		let fontSize = Math.ceil( 20 * Math.min( canvasSize[0] / this.width, canvasSize[1] / this.height ) );
		var x = fontSize;
		var y = fontSize;
		var lineHeight = Math.ceil( fontSize * 1.4 );
		var k = 100;
		
		context.font = fontSize.toString() + "px Arial";
		context.fillStyle = 'rgba(255,0,0,1.0)';

		context.fillText( 'Origin: ' + this.vecToString( viewState.getOrigin(), 100 ),
			x,y+=lineHeight);

		context.fillStyle = 'rgba( 0, 216, 96, 1.0 )';
		context.fillText( 'VectorX: '+ Math.round( vec3.length(viewState.xAxis) ) + ' ' + this.vecToString( viewState.xAxis, 100 ),
			x,y+=lineHeight);
			
		context.fillStyle = 'rgba( 0, 96, 216, 1.0 )';
		context.fillText( 'VectorY: '+ Math.round( vec3.length(viewState.yAxis) ) + ' ' + this.vecToString( viewState.yAxis, 100 ),
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
	
	private fillPolygone( context, path, color: string = 'rgba(0,255,0,0.2)' ){
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		for( let p = 1; p < path.length; p++ ) context.lineTo(path[p][0],path[p][1]);
		context.lineTo(path[0][0],path[0][1]);
		context.closePath();
		context.fillStyle = color;
		context.fill();
	}
	private strokePolygone( context, path, width: number = 1.0, color: string = 'rgba(255,0,0,0.2)' ){
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		for( let p = 1; p < path.length; p++ ) context.lineTo(path[p][0],path[p][1]);
		context.lineTo(path[0][0],path[0][1]);
		context.closePath();
		context.lineWidth = 1.0;
		context.strokeStyle = color;
		context.stroke();
	}
	private fillCircle( context, center: number[], radius: number = 10, color: string = 'rgba( 255, 0, 0, 1.0 )' ){
		context.beginPath();
		context.arc( center[0], center[1], radius, 0, Math.PI * 2 );
		context.closePath();
		context.fillStyle = color;
		context.fill();
	}

}
