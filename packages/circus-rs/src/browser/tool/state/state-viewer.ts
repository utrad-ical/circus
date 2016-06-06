'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool }							from '../../../browser/tool/tool';
import { CrossSection }					from '../../../browser/interface/cross-section';
import { CrossSectionUtil }				from '../../../browser/util/cross-section-util';
import { Painter }						from '../../../browser/interface/painter';

type Degree = number;

export class StateViewer implements Painter {

	private canvasDomElement;
	
	private scale = 1.0;
	private worldSize = 512;
	
	private models;
	private matrix;
	
	private renderCount = 0;
	
	private camera;
	private eye = [0,0,1];
	private eyeDepth = 512;
	private focus = [0,0,0];
	private up = [0,1,0];
	private pan = 1.0;
	
	constructor(){
		this.models = [];
		this.setToAxial();
	}
	public setToAxial(){
		this.scale = 1.0;
		this.eye = [0,0,1];
		this.focus = [0,0,0];
		this.up = [0,1,0];
		this.camera = {
			eye: vec3.clone( this.eye ),
			focus: vec3.clone( this.focus ),
			up: vec3.clone( this.up )
		};
	}
	
	public addObject( model ){
		this.models.push( model );
	}
	public clearObject(){
		this.models = [];
	}
	
	public draw( canvasDomElement, stateOfViewer ){
		
		this.renderCount++;
		let viewport = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ];
		let state = this.updateState( viewport );
		this.models.forEach( m => m.draw( canvasDomElement, state ) );
		
		return null;
	}
	
	private updateState( viewport ){
		
		// model coordinates to world coordinates
		let model = mat4.create();
		mat4.translate( model, model, [ -0.5, -0.5, -0.5 ] );
		// mat4.rotate( model, model, 15 * Math.PI / 180.0  , [0,0,1] );
		mat4.scale( model, model, [ 1 / this.worldSize, 1 / this.worldSize, 1 / this.worldSize ] );
		
		// world coordinates to camera coordinates
		let camera = mat4.lookAt( mat4.create() ,
			this.camera.eye, // eye
			this.camera.focus, // [0, 0, 0], // focus
			this.camera.up // up
		);
		
		// camera coordinates to homogeneous coordinates
		let pan = this.pan;
		let near = this.eyeDepth / this.worldSize;
		let far = ( this.eyeDepth + 1 ) / this.worldSize;
		let projection = mat4.ortho( mat4.create(), -0.5 * pan, 0.5 * pan, -0.5 * pan, 0.5 * pan, near, far );
		let screen =  [
			viewport[0] / 2, 0, 0, 0,
			0, viewport[1] / 2, 0, 0,
			0, 0, 1, 0,
			viewport[0] / 2, viewport[1] / 2, 0, 1
		];
		
		// model, camera, projection, screen
		
		let matrix = mat4.create();
		mat4.multiply( matrix, model, matrix );
		mat4.multiply( matrix, camera, matrix );
		mat4.multiply( matrix, projection, matrix );
		mat4.multiply( matrix, screen, matrix );
		
		this.matrix = matrix;
		
		/**
		 * return state object
		 */
		let modelViewState = {
			t: this.renderCount,
			pan: this.pan,
			viewport: viewport,
			camera: {
				eye: vec3.clone(this.camera.eye),
				focus: vec3.clone(this.camera.focus),
				up: vec3.clone(this.camera.up)
			},
			matrix: this.matrix,
			
			depth: this.eyeDepth
		};
		return modelViewState;
	}
	
	public setCelestialCamera( horizontal: Degree, vertical: Degree ){
		// axial is h:0, v:0
		// horizontal: -180 to 180
		// vertical: -180 to 180
		
		let hRad = Math.PI / 180.0 * horizontal;
		let vRad = Math.PI / 180.0 * vertical;
		
		let eye = vec3.clone( this.eye );
		let up = vec3.clone( this.up );
		
		this.rotateByQuotanion( hRad, up, eye );

		let vAxis = vec3.cross( vec3.create(), eye, up );
		vec3.normalize(vAxis, vAxis);
		this.rotateByQuotanion( vRad, vAxis, eye );
		
		this.rotateByQuotanion( vRad, vAxis, up );
		
		this.camera.eye = eye;
		this.camera.up = up;
	}
	private rotateByQuotanion( t, u, v ){
		let P = quat.fromValues( v[0], v[1], v[2], 0 );
		let Q = quat.fromValues(
			-u[0] * Math.sin(t / 2),
			-u[1] * Math.sin(t / 2),
			-u[2] * Math.sin(t / 2),
			Math.cos(t/2)
		);
		let R = quat.fromValues(
			u[0] * Math.sin(t / 2),
			u[1] * Math.sin(t / 2),
			u[2] * Math.sin(t / 2),
			Math.cos(t/2)
		);
		let S = quat.create();
		quat.multiply( S, P, Q );
		quat.multiply( S, R, S );
		
		v[0] = S[0];
		v[1] = S[1];
		v[2] = S[2];
		
		return v;
	}

	public getWorldCube(){
		return new WorldBoxObject( this.worldSize );
	}
}

export abstract class StateViewerObject {
	public abstract draw( canvasDomElement, modelViewState ): void;
}
export class WorldBoxObject extends StateViewerObject {

	private boxVertex;

	constructor( size: number ){
		super();
		this.boxVertex = Vertex.rectangular( vec3.fromValues( size, size, size ) );
	}
	
	public draw( canvasDomElement, modelViewState ){
		
		let context = canvasDomElement.getContext('2d');
	
		let boxPoints = this.boxVertex.map( p => vec3.transformMat4(vec3.create(), p, modelViewState.matrix) );
		// x-axis
		Vertex.strokePolygone( context, 
			[boxPoints[0], boxPoints[1]],
			5, 'rgba(216,216,255,1)'
		);
		// y-axis
		Vertex.strokePolygone( context, 
			[boxPoints[0], boxPoints[3]],
			5, 'rgba(216,255,216,1)'
		);
		// z-axis
		Vertex.strokePolygone( context, 
			[boxPoints[0], boxPoints[7]],
			5, 'rgba(255,216,216,1)'
		);

		
		// xz-plane
		Vertex.fillPolygone( context, 
			[boxPoints[0], boxPoints[1], boxPoints[6], boxPoints[7]],
			'rgba(0,0,255,0.2)'
		);
		// yz-plane
		Vertex.fillPolygone( context, 
			[boxPoints[0], boxPoints[3], boxPoints[4], boxPoints[7]],
			'rgba(0,255,0,0.2)'
		);
		// yz-plane
		Vertex.fillPolygone( context, 
			[boxPoints[0], boxPoints[1], boxPoints[2], boxPoints[3]],
			'rgba(255,0,0,0.2)'
		);
	}
}
export class WireAxisBoxObject extends StateViewerObject {
	
	public dimension;
	
	constructor( dimension ){
		super();
		this.dimension = dimension;
	}
	
	public draw( canvasDomElement, modelViewState ){
		let context = canvasDomElement.getContext('2d');

		let rectangular = Vertex.rectangular( this.dimension );
		let points = rectangular.map(
			p => vec3.transformMat4(vec3.create(), p, modelViewState.matrix)
		);
		Vertex.strokePolygone( context, [ points[0],points[1],points[2],points[3] ], 1, 'rgba(64,64,64,1.0)' );
		Vertex.strokePolygone( context, [ points[4],points[5],points[6],points[7] ], 1, 'rgba(64,64,64,1.0)' );
		Vertex.strokePolygone( context, [ points[0],points[7] ], 1, 'rgba(64,64,64,1.0)' );
		Vertex.strokePolygone( context, [ points[1],points[6] ], 1, 'rgba(64,64,64,1.0)' );
		Vertex.strokePolygone( context, [ points[2],points[5] ], 1, 'rgba(64,64,64,1.0)' );
		Vertex.strokePolygone( context, [ points[3],points[4] ], 1, 'rgba(64,64,64,1.0)' );
		Vertex.strokePolygone( context, [ points[0],points[1] ], 1, 'rgba(0,0,255,1.0)' );
		Vertex.strokePolygone( context, [ points[0],points[3] ], 1, 'rgba(0,255,0,1.0)' );
		Vertex.strokePolygone( context, [ points[0],points[7] ], 1, 'rgba(255,0,0,1.0)' );
	}
}
export class CrossSectionObject extends StateViewerObject {

	private crossSection;

	constructor( crossSection ){
		super();
		this.crossSection = crossSection;
	}
	
	public draw( canvasDomElement, modelViewState ){
		
		let context = canvasDomElement.getContext('2d');
		
		// get vertexes
		let vertexes = CrossSectionUtil.vertex( this.crossSection ).map( p => {
		 	return vec3.transformMat4( vec3.create(), p, modelViewState.matrix );
		} );
		
		// draw cross section guideline
		Vertex.fillPolygone( context, vertexes, 'rgba(64,64,64,0.3)' );
		Vertex.strokePolygone( context, [ vertexes[0],vertexes[1] ], 2, 'rgba(0,0,255,1.0)' );
		Vertex.strokePolygone( context, [ vertexes[0],vertexes[3] ], 2, 'rgba(0,255,0,1.0)' );
		Vertex.fillCircle( context, vertexes[0], 3, 'rgba(255,0,0,1.0)' );
	}
}
export class DotObject extends StateViewerObject {

	private dot;

	constructor( dot ){
		super();
		this.dot = dot;
	}
	public draw( canvasDomElement, modelViewState ){
		
		let context = canvasDomElement.getContext('2d');
		let p = vec3.transformMat4( vec3.create(), this.dot, modelViewState.matrix );
		Vertex.fillCircle( context, p, 2, 'rgba(255,0,0,1.0)' );
	}
}

class Vertex {
	public static str( vertexes ){
		let vstr = [];
		vertexes.forEach( v => {
			vstr.push( vec3.str(v) );
		});
		return '( '+vstr.join(', ')+' )';
	}
	public static round( vertexes ){
		vertexes.forEach( v => {
			for( let i = 0; i < v.length; i++ ){
				v[i] = Math.round(v[i]);
			}
		} );
		return vertexes;
	}
	public static onScreen( vertex ){
		let frontSide = false;
		let backSide = false;
		for( let i = 0; i < vertex.length; i++ ){
			if( vertex[2] <= 0 ) backSide = true;
			if( 0 <= vertex[2] ) frontSide = true;
			if( frontSide && backSide ) break;
		}
		return frontSide && backSide;
	}
	public static pathSort( vertex ){
		if( vertex.length > 1 ){
			
			let vertex2D = [];
			let c = vec3.create();
			vertex.forEach( p => vec3.add(c,c,p) );
			vec3.scale( c, c, 1 / vertex.length );
			
			vertex = vertex.sort( (a,b) => {
				let v1 = vec2.sub( vec2.create(), c, a );
				let theta1 = Math.acos( v1[0] / vec2.length(v1) ) * ( v1[1] < 0 ? -1 : 1 );

				let v2 = vec2.sub( vec2.create(), c, b );
				let theta2 = Math.acos( v2[0] / vec2.length(v2) ) * ( v2[1] < 0 ? -1 : 1 );
				
				return theta1 < theta2 ? -1
					 : theta1 == theta2 ? 0
					 : 1;
			} );
		}
		return vertex;
		
	}
	public static rectangular( size, offset? ){
		if (typeof offset === 'undefined' || offset === null)
			offset = vec3.create();
		
		let vertex = [
			vec3.create(), vec3.create(), vec3.create(), vec3.create(),
			vec3.create(), vec3.create(), vec3.create(), vec3.create()
		];
		vec3.copy( vertex[0], offset );
		vec3.add( vertex[1], vertex[0], vec3.fromValues( size[0],0,0 ) );
		vec3.add( vertex[2], vertex[1], vec3.fromValues( 0,size[1],0 ) );
		vec3.subtract( vertex[3], vertex[2], vec3.fromValues( size[0],0,0 ) );
		vec3.add( vertex[4], vertex[3], vec3.fromValues( 0,0,size[2] ) );
		vec3.add( vertex[5], vertex[4], vec3.fromValues( size[0], 0,0 ) );
		vec3.subtract( vertex[6], vertex[5], vec3.fromValues( 0, size[1], 0 ) );
		vec3.subtract( vertex[7], vertex[6], vec3.fromValues( size[0], 0, 0 ) );
		return vertex;
	}
	public static fillPolygone( context, path, color: string = 'rgba(0,255,0,0.2)' ){
		if( path.length === 0 ) return;
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		for( let p = 1; p < path.length; p++ ) context.lineTo(path[p][0],path[p][1]);
		context.lineTo(path[0][0],path[0][1]);
		context.closePath();
		context.fillStyle = color;
		context.fill();
	}
	/**
	 * unclosing path
	 */
	public static pathPolygone( context, path ){
		if( path.length === 0 ) return;
		context.save();
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		for( let p = 1; p < path.length; p++ ) context.lineTo(path[p][0],path[p][1]);
		context.lineTo(path[0][0],path[0][1]);
		context.closePath();
		context.restore();
		return context;
	}
	public static strokePolygone( context, path, width: number = 1.0, color: string = 'rgba(255,0,0,0.2)' ){
		if( path.length === 0 ) return;
		context.save();
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		for( let p = 1; p < path.length; p++ ) context.lineTo(path[p][0],path[p][1]);
		context.lineTo(path[0][0],path[0][1]);
		context.closePath();
		context.lineWidth = 1.0;
		context.strokeStyle = color;
		context.stroke();
		context.restore();
	}
	public static fillCircle( context, center: [number,number], radius: number = 10, color: string = 'rgba( 255, 0, 0, 1.0 )' ){
		context.save();
		context.beginPath();
		context.arc( center[0], center[1], radius, 0, Math.PI * 2 );
		context.closePath();
		context.fillStyle = color;
		context.fill();
		context.restore();
	}
}
