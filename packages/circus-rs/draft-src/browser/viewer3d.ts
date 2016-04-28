'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

type Vector3 = [number,number,number];
type Point3 = [number,number,number];
type Degree = number;

export class Viewer3D {

	private canvasDomElement;
	private crossSection;
	private imageSource;
	
	private viewport;
	private scale = 1.0;
	private worldSize = 512;
	
	private models;
	
	private matrix;
	
	private viewMatrix;
	private renderCount = 0;
	
	private camera;
	
	private eye = [0,0,1];
	private eyeDepth = 512;
	private focus = [0,0,0];
	private up = [0,1,0];

	private pan = 1.0;
	
	public cameraOverview(){
		this.scale = 2.0;
		this.camera = {
			eye: [1,1,1],
			focus: [0,0,0],
			up: [0,0.0,1.0]
		};
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
	
	constructor( canvas ){
		this.canvasDomElement = canvas;
		this.viewport = [ canvas.getAttribute('width'), canvas.getAttribute('height') ];
		
		this.models = [];
		this.setToAxial();
		this.updateMatrix();
	}
	public addObject( model ){
		this.models.push( model );
	}
	
	public renderda( flag: boolean = false ){
		this.renderCount++ ;
		this.updateMatrix();
		let state = this.getViewState();
		state.crossSectionContent = flag;
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
			regularPlane: this.crossSection,
			matrix: this.matrix,
			
			depth: this.eyeDepth,
			
			crossSectionContent: false
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
		this.crossSection = this.regularPlane();
	}
	public regularPlane(){
		
		let inv = mat4.invert( mat4.create(), this.matrix );
		let origin = vec3.transformMat4(vec3.create(), [ 0, 0 ,0], inv);
		let xEnd = vec3.transformMat4(vec3.create(), [ this.viewport[0], 0 ,0], inv);
		let yEnd = vec3.transformMat4(vec3.create(), [ 0, this.viewport[1] ,0], inv);
		
		let regularPlane = {
			origin: origin,
			xAxis: vec3.subtract( xEnd, xEnd, origin ),
			yAxis: vec3.subtract( yEnd, yEnd, origin )
		};
		
		return regularPlane;
	}
	
	
	public clear(): void {
		this.canvasDomElement.getContext('2d').clearRect(
			0,0,
			Number( this.canvasDomElement.getAttribute('width') ),
			Number( this.canvasDomElement.getAttribute('height') )
		);
	}
	public drawBy( painter ) {
		painter.draw( this.canvasDomElement, this.getViewState() );
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
	
		let regularMarker = CrossSection.vertex( viewState.regularPlane )
			.map( p => vec3.transformMat4(vec3.create(), p, viewState.matrix) )
			.forEach( p =>{
				Vertex.fillCircle( context, p, 15, 'rgba(255,64,0,1)' );
			} );

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
export class TriangleObject extends ViewerObject {

	public draw( canvasDomElement, viewState ){
		let context = canvasDomElement.getContext('2d');
		
		let triangle = [
			[  200,  0, 0.0 ],
			[  100, 100, 0.0 ],
			[  300, 100, 0.0 ]
		];
		
		let triangleScreen = triangle.map( p => {
			let s = vec3.transformMat4( vec3.create(), p, viewState.matrix );
			if( viewState.t === 1 ) console.log( vec3.str(p) );
			if( viewState.t === 1 ) console.log( vec3.str(s) );
			
			Vertex.fillCircle( context, s, 3, 'rgba(255,0,0,1.0)' );
			return s;
		} );
		Vertex.fillPolygone( context, triangleScreen, 'rgba(255,0,0,0.1)' );
		Vertex.fillCircle( context,
			vec3.transformMat4( vec3.create(), [0,0,0], viewState.matrix ),
			3, 'rgba(0,0,255,1.0)' );
	}
}
export class CrossSectionObject extends ViewerObject {

	private crossSection;
	public volume;

	constructor( crossSection ){
		super();
		this.crossSection = crossSection;
	}
	public draw( canvasDomElement, viewState ){
		
		this.crossSection = viewState.regularPlane;
		
		let context = canvasDomElement.getContext('2d');
		
		// get vertexes
		let vertexes = CrossSection.vertex( this.crossSection ).map( p => {
		 	return vec3.transformMat4( vec3.create(), p, viewState.matrix );
		} );

		// get intersections
		let intersections = Vertex.pathSort(
			this.getIntersection( this.crossSection ).map(
				i => vec3.transformMat4(vec3.create(), i, viewState.matrix)
			)
		);
		if( intersections.length === 0 ) return;
		
		// get bound box
		let edge=[ [ 99999, 99999 ], [-99999,-99999] ];
		intersections.forEach( p => {
			edge[0][0] = Math.max(0, Math.min(edge[0][0],p[0]) );
			edge[0][1] = Math.max(0, Math.min(edge[0][1],p[1]) );
			edge[1][0] = Math.min( viewState.viewport[0], Math.max(edge[1][0],p[0]) );
			edge[1][1] = Math.min( viewState.viewport[1], Math.max(edge[1][1],p[1]) );
		} );
		
		let boundBox = [
			edge[0],
			[ edge[1][0], edge[0][1] ],
			edge[1],
			[ edge[0][0], edge[1][1] ]
		];
		
		// draw cross section guideline
		if( true ){
			Vertex.fillPolygone( context, vertexes, 'rgba(64,64,64,0.1)' );
			Vertex.strokePolygone( context, [ vertexes[0],vertexes[1] ], 1, 'rgba(0,0,255,1.0)' );
			Vertex.strokePolygone( context, [ vertexes[0],vertexes[3] ], 1, 'rgba(0,255,0,1.0)' );
			Vertex.fillCircle( context, vertexes[0], 3, 'rgba(0,0,255,1.0)' );
		}
		
		// draw outerbox
		if ( this.volume ){
			let rectangular = Vertex.rectangular( this.volume.getDimension() );
			let points = rectangular.map(
				p => vec3.transformMat4(vec3.create(), p, viewState.matrix)
			);
			Vertex.strokePolygone( context, [ points[0],points[1],points[2],points[3] ], 1, 'rgba(64,64,64,1.0)' );
			Vertex.strokePolygone( context, [ points[4],points[5],points[6],points[7] ], 1, 'rgba(64,64,64,1.0)' );
			Vertex.strokePolygone( context, [ points[0],points[7] ], 1, 'rgba(64,64,64,1.0)' );
			Vertex.strokePolygone( context, [ points[1],points[6] ], 1, 'rgba(64,64,64,1.0)' );
			Vertex.strokePolygone( context, [ points[2],points[5] ], 1, 'rgba(64,64,64,1.0)' );
			Vertex.strokePolygone( context, [ points[3],points[4] ], 1, 'rgba(64,64,64,1.0)' );
		}
		// draw intersect points
		if( true ){
			Vertex.fillPolygone( context, intersections, 'rgba(64,64,64,0.6)' );
			intersections.forEach( i => {
				Vertex.fillCircle( context, i, 3, 'rgba(64,64,64,1.0)' );
			} );
		}
		
		// draw bound box
		if( true ){
			Vertex.strokePolygone( context, boundBox, 3, 'rgb(255,0,0)' );
		}
		
		// render cross section content
		if ( true || this.volume && viewState.crossSectionContent ){
			
			let inverse = mat4.invert( mat4.create(), viewState.matrix );
			
			let invBoundBox = boundBox.map( p => {
				return vec3.transformMat4( vec3.create(), [ p[0], p[1], 0 ], inverse );
			} );
			Vertex.round(invBoundBox);
			
			let minPlane = {
				origin: invBoundBox[0],
				xAxis: vec3.subtract( vec3.create(), invBoundBox[1], invBoundBox[0] ),
				yAxis: vec3.subtract( vec3.create(), invBoundBox[3], invBoundBox[0] )
			};
			
			let width = Math.floor( boundBox[2][0] - boundBox[0][0] );
			let height = Math.floor( boundBox[2][1] - boundBox[0][1] );
			
			let eu = vec3.scale( vec3.create(), minPlane.xAxis, 1 / width );
			let ev = vec3.scale( vec3.create(), minPlane.yAxis, 1 / height );
			let imageBuffer = new Uint8Array( width * height );
			this.volume.scanOblique(
				minPlane.origin,
				eu, ev,
				[ width, height ],
				imageBuffer,
				2277, // viewState.getWindowWidth()
				138 // viewState.getWindowLevel(),
			);
			
			boundBox.forEach( i => {
				i[0] = Math.floor( i[0] );
				i[1] = Math.floor( i[1] );
			});
			
			if( false ){
				let idx = 0, pixel;
				for (let y = 0; y < height; y++) {
					for (let x = 0; x < width; x++) {
						pixel = imageBuffer[idx].toString();
						if( pixel !== '0' ){
							context.fillStyle = 'rgb('+pixel+','+pixel+','+pixel+')';
							context.fillRect(x + boundBox[0][0],y + boundBox[0][1],1, 1 );
						}
						idx++;
					}
				}
			}
			
			// This check is too heavy, so using pixel !== 0.
			// let checkContext = Vertex.pathPolygone( context, intersections );
			// if( checkContext.isPointInPath(boundBox[0][0] + x, boundBox[0][1] + y) ) { ... 
			
			if( true ){
				let idx = 0, alpha = 0.3, dstidx, pixel;
				let canvasRaw = context.getImageData( boundBox[0][0], boundBox[0][1], width, height );
				for (let y = 0; y < height; y++) {
					for (let x = 0; x < width; x++) {
						pixel = imageBuffer[idx];

						dstidx = idx << 2; // meaning mul 4
						if( pixel !== 0 ){
							canvasRaw.data[dstidx] = pixel;//Math.round( canvasRaw.data[dstidx] * ( 1-alpha ) + pixel * alpha );
							canvasRaw.data[dstidx + 1] = pixel;// = Math.round( canvasRaw.data[dstidx] * ( 1-alpha ) + pixel * alpha );
							canvasRaw.data[dstidx + 2] = pixel;// = Math.round( canvasRaw.data[dstidx] * ( 1-alpha ) + pixel * alpha );
							canvasRaw.data[dstidx + 3] = 0xff;
						}
						idx++;
					}
				}
				context.putImageData( canvasRaw, boundBox[0][0], boundBox[0][1] );
			}
			
		}
	}
	public getIntersection( plane ){
		let rectangular = Vertex.rectangular( this.volume.getDimension() );
		
		let axisLines = [];
		axisLines.push( [ rectangular[0],rectangular[1] ] );
		axisLines.push( [ rectangular[0],rectangular[3] ] );
		axisLines.push( [ rectangular[0],rectangular[7] ] );
		
		axisLines.push( [ rectangular[2],rectangular[3] ] );
		axisLines.push( [ rectangular[2],rectangular[1] ] );
		axisLines.push( [ rectangular[2],rectangular[5] ] );

		axisLines.push( [ rectangular[4],rectangular[5] ] );
		axisLines.push( [ rectangular[4],rectangular[7] ] );
		axisLines.push( [ rectangular[4],rectangular[3] ] );

		axisLines.push( [ rectangular[6],rectangular[7] ] );
		axisLines.push( [ rectangular[6],rectangular[5] ] );
		axisLines.push( [ rectangular[6],rectangular[1] ] );
		
		let intersections = [];
		
		for( var xyz=0; xyz<axisLines.length; xyz++){
			let intersection = CrossSection.intersectLineSegment( plane, axisLines[xyz], true );
			if( intersection !== false && intersection !== true ){
				intersections.push( intersection );
			}
		}
		
		return intersections;
	}
}
export class CrossSection {

	public static center( crossSection ): Point3 {
		let center = vec3.create();
		vec3.add( center, center, crossSection.xAxis );
		vec3.add( center, center, crossSection.yAxis );
		vec3.scale( center, center, 0.5 );
		vec3.add( center, crossSection.origin, center );
		return center;
	}
	
	public static vertex( crossSection ){
		let vertex = [
			vec3.clone( crossSection.origin ),
			vec3.create(),
			vec3.create(),
			vec3.create()
		];
		vec3.add( vertex[1], vertex[0], crossSection.xAxis );
		vec3.add( vertex[2], vertex[1], crossSection.yAxis );
		vec3.subtract( vertex[3], vertex[2], crossSection.xAxis );
		return vertex;
	}
	
	public static normalVector( crossSection ) {
		let nv = vec3.create();
		vec3.cross(nv, crossSection.xAxis, crossSection.yAxis);
		vec3.normalize(nv, nv);
		return nv;
	}
	
	public static scale( crossSection, scale: number, centralPoint?: Point3) {

		if (typeof centralPoint === 'undefined' || centralPoint === null)
			centralPoint = CrossSection.center( crossSection );

		let operation = [
			t => mat4.translate( t, t, vec3.scale( vec3.create(), centralPoint, -1) ),
			t => mat4.scale( t, t, vec3.fromValues( scale, scale, scale ) ),
			t => mat4.translate( t, t, centralPoint )
		].reverse().reduce( (p, t) => t(p), mat4.create() );

		let xEndPoint = vec3.add(vec3.create(), crossSection.origin, crossSection.xAxis );
		let yEndPoint = vec3.add(vec3.create(), crossSection.origin, crossSection.yAxis );
		let [ o, x, y ] = [ crossSection.origin, xEndPoint, yEndPoint ].map(
			p => vec3.transformMat4(vec3.create(), p, operation)
		);
		return {
			origin: o,
			xAxis: vec3.subtract(vec3.create(), x, o),
			yAxis: vec3.subtract(vec3.create(), y, o)
		};
	}
	/**
	 * Rotates about an arbitrary vector passing through the arbitrary point.
	 * Angle unit is degree.
	 * Todo: Use the multiplication in order to reduce the number of operations.
	 */
	public static rotate( crossSection, deg: number, axis: Vector3, centralPoint?: Point3) {

		if (typeof centralPoint === 'undefined' || centralPoint === null)
			centralPoint = CrossSection.center( crossSection );

		let radian = Math.PI / 180.0 * deg;

		let operation = [
			t => mat4.translate( t, t, vec3.scale( vec3.create(), centralPoint, -1) ),
			t => mat4.rotate( t, t, radian, axis ),
			t => mat4.translate( t, t, centralPoint )
		].reverse().reduce((p, t) => t(p), mat4.create());

		let xEndPoint = vec3.add(vec3.create(), crossSection.origin, crossSection.xAxis );
		let yEndPoint = vec3.add(vec3.create(), crossSection.origin, crossSection.yAxis );
		let [ o, x, y ] = [ crossSection.origin, xEndPoint, yEndPoint ].map(
			p => vec3.transformMat4(vec3.create(), p, operation)
		);
		return {
			origin: o,
			xAxis: vec3.subtract(vec3.create(), x, o),
			yAxis: vec3.subtract(vec3.create(), y, o)
		};
	}

	public static intersectLineSegment( crossSection, line, asPlane?:boolean ){
	
		let oa = vec3.subtract( vec3.create(), line[0], crossSection.origin );
		let ob = vec3.subtract( vec3.create(), line[1], crossSection.origin );
		let nv = CrossSection.normalVector( crossSection );
		
		let oaDot = vec3.dot( oa, nv );
		let obDot = vec3.dot( ob, nv );
		
		if( oaDot === 0 && obDot === 0 ){ // on the crossSection both
//console.log('on the crossSection both');
			return true;
		}else if( 0 < oaDot && 0 < obDot ){ // upper the crossSection both
//console.log('upper the crossSection both');
			return false;
		}else if( oaDot < 0 && obDot < 0 ){ // under the crossSection both
//console.log('under the crossSection both');
			return false;
		}else{
			let ab = vec3.subtract( vec3.create(), line[1], line[0] );
			let h = Math.abs( oaDot ) / ( Math.abs( oaDot ) + Math.abs( obDot ) );
			
			if( ( h < 0 || 1 < h ) && !asPlane) return false; // over the cross section ( but on the plane )
			
			let intersection = vec3.create();
			vec3.scale( intersection, ab, h );
			vec3.add( intersection, intersection, line[0] );
			
			return intersection;
		}
	}
}
export class Vertex {
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
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		for( let p = 1; p < path.length; p++ ) context.lineTo(path[p][0],path[p][1]);
		context.lineTo(path[0][0],path[0][1]);
		context.closePath();
		return context;
	}
	public static strokePolygone( context, path, width: number = 1.0, color: string = 'rgba(255,0,0,0.2)' ){
		if( path.length === 0 ) return;
		context.beginPath();
		context.moveTo( path[0][0],path[0][1] );
		for( let p = 1; p < path.length; p++ ) context.lineTo(path[p][0],path[p][1]);
		context.lineTo(path[0][0],path[0][1]);
		context.closePath();
		context.lineWidth = 1.0;
		context.strokeStyle = color;
		context.stroke();
	}
	public static fillCircle( context, center: [number,number], radius: number = 10, color: string = 'rgba( 255, 0, 0, 1.0 )' ){
		context.beginPath();
		context.arc( center[0], center[1], radius, 0, Math.PI * 2 );
		context.closePath();
		context.fillStyle = color;
		context.fill();
	}
}
