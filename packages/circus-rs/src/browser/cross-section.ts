'use strict';

let {mat4, vec3} = require('gl-matrix');

type Vector3 = [number,number,number];
type Point3 = [number,number,number];
type Degree = number;

export class CrossSection {

	public static copy( dst, src ) {
		dst.origin[0] = src.origin[0];
		dst.origin[1] = src.origin[1];
		dst.origin[2] = src.origin[2];
		dst.xAxis[0] = src.xAxis[0];
		dst.xAxis[1] = src.xAxis[1];
		dst.xAxis[2] = src.xAxis[2];
		dst.yAxis[0] = src.yAxis[0];
		dst.yAxis[1] = src.yAxis[1];
		dst.yAxis[2] = src.yAxis[2];
	}
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
		let xAxis = vec3.subtract(vec3.create(), x, o);
		let yAxis = vec3.subtract(vec3.create(), y, o);
		
		crossSection.origin[0] = o[0];
		crossSection.origin[1] = o[1];
		crossSection.origin[2] = o[2];
		crossSection.xAxis[0] = xAxis[0];
		crossSection.xAxis[1] = xAxis[1];
		crossSection.xAxis[2] = xAxis[2];
		crossSection.yAxis[0] = yAxis[0];
		crossSection.yAxis[1] = yAxis[1];
		crossSection.yAxis[2] = yAxis[2];
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
		
		let xAxis = vec3.subtract(vec3.create(), x, o);
		let yAxis = vec3.subtract(vec3.create(), y, o);
		
		crossSection.origin[0] = o[0];
		crossSection.origin[1] = o[1];
		crossSection.origin[2] = o[2];
		crossSection.xAxis[0] = xAxis[0];
		crossSection.xAxis[1] = xAxis[1];
		crossSection.xAxis[2] = xAxis[2];
		crossSection.yAxis[0] = yAxis[0];
		crossSection.yAxis[1] = yAxis[1];
		crossSection.yAxis[2] = yAxis[2];
	}
	
	public static getVoxelMapperMatrix( section, viewport ){
		
		let nv = CrossSection.normalVector( section );
		
		let xAxisLength = vec3.length( section.xAxis );
		
		let scale = xAxisLength / viewport[1];
		let scaleMatrix = mat4.scale( mat4.create(), mat4.create(), vec3.fromValues( scale,scale,scale ) );

		let viewMatrix = mat4.create();
		mat4.lookAt( viewMatrix, nv, [0,0,0], section.yAxis );
		mat4.invert( viewMatrix, viewMatrix );
		
		let move = vec3.add( vec3.create(), section.origin, nv.map( i => i * -scale ) );
		let transMatrix = mat4.translate( mat4.create(), mat4.create(), move );
		
		let matrix = mat4.create();
		mat4.multiply( matrix, viewMatrix, matrix );
		mat4.multiply( matrix, scaleMatrix, matrix );
		mat4.multiply( matrix, transMatrix, matrix );
		
		return matrix;
	}
	
}