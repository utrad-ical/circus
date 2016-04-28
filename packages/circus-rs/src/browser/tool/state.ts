'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');
import { Tool } from './tool'
import { CrossSection } from '../cross-section'
import { Vertex } from '../vertex'

type Vector3 = [number,number,number];
type Point3 = [number,number,number];
type Degree = number;

export class ViewStateTool extends Tool {

	private canvasDomElement;
	
	private viewport;
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
	
	constructor( canvas ){
		super();
		this.canvasDomElement = canvas;
		this.viewport = [ canvas.getAttribute('width'), canvas.getAttribute('height') ];
		
		this.models = [];
		this.setToAxial();
		this.updateMatrix();
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
	public draw(c,s){
		this.render();
	}
	public render(){
		this.renderCount++ ;
		this.updateMatrix();
		let state = this.getViewState();
		this.models.forEach( m => m.draw( this.canvasDomElement, state ) );
	}
	public getViewState(){
		let viewState = {
			t: this.renderCount,
			pan: this.pan,
			viewport: this.viewport,
			camera: {
				eye: vec3.clone(this.camera.eye),
				focus: vec3.clone(this.camera.focus),
				up: vec3.clone(this.camera.up)
			},
			matrix: this.matrix,
			
			depth: this.eyeDepth
		};
		return viewState;
	}
	private updateMatrix(){
		
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
		let viewport = this.viewport;
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
	}
	
	public clear(): void {
		this.canvasDomElement.getContext('2d').clearRect(
			0,0,
			Number( this.viewport[0] ),
			Number( this.viewport[1] )
		);
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

export abstract class ViewerObject {}
export class WorldBoxObject extends ViewerObject {

	private boxVertex;

	constructor( size: number ){
		super();
		this.boxVertex = Vertex.rectangular( vec3.fromValues( size, size, size ) );
	}
	
	public draw( canvasDomElement, viewState ){
		
		let context = canvasDomElement.getContext('2d');
	
		let boxPoints = this.boxVertex.map( p => vec3.transformMat4(vec3.create(), p, viewState.matrix) );
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
export class CrossSectionObject extends ViewerObject {

	private crossSection;
	public dimension;

	constructor( crossSection ){
		super();
		this.crossSection = crossSection;
	}
	public draw( canvasDomElement, viewState ){
		
		let context = canvasDomElement.getContext('2d');
		
		context.beginPath();
		context.rect( 0, 0, canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') )
		context.closePath();
		context.fillStyle='rgba(255,255,255,0.4)';
		context.fill();
		
		
		// get vertexes
		let vertexes = CrossSection.vertex( this.crossSection ).map( p => {
		 	return vec3.transformMat4( vec3.create(), p, viewState.matrix );
		} );
		
		// draw outerbox
		if ( this.dimension ){
			let rectangular = Vertex.rectangular( this.dimension );
			let points = rectangular.map(
				p => vec3.transformMat4(vec3.create(), p, viewState.matrix)
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
		// draw cross section guideline
		if( true ){
			Vertex.fillPolygone( context, vertexes, 'rgba(64,64,64,0.3)' );
			Vertex.strokePolygone( context, [ vertexes[0],vertexes[1] ], 2, 'rgba(0,0,255,1.0)' );
			Vertex.strokePolygone( context, [ vertexes[0],vertexes[3] ], 2, 'rgba(0,255,0,1.0)' );
			Vertex.fillCircle( context, vertexes[0], 3, 'rgba(255,0,0,1.0)' );
		}
	}
}
export class DotObject extends ViewerObject {

	private dot;

	constructor( dot ){
		super();
		this.dot = dot;
	}
	public draw( canvasDomElement, viewState ){
		
		let context = canvasDomElement.getContext('2d');
		let p = vec3.transformMat4( vec3.create(), this.dot, viewState.matrix );
		Vertex.fillCircle( context, p, 2, 'rgba(255,0,0,1.0)' );
	}
}

