'use strict';

let {mat4, vec3} = require('gl-matrix');

type Vector3 = [number,number,number];
type Point3 = [number,number,number];

export class CrossSectionUtil {
	
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
			centralPoint = CrossSectionUtil.center( crossSection );

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
			centralPoint = CrossSectionUtil.center( crossSection );

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
	
	// public static getCelestialAngle( section1, section2 ){
		// let nv1 = vec3.cross( vec3.create(), section1.xAxis, section1.yAxis );
		// let nv2 = vec3.cross( vec3.create(), section2.xAxis, section2.yAxis );
		
		// let cosTheta = ( nv1[0] * nv2[0] + nv1[1] * nv2[1] + nv1[2] * nv2[2] )
			// / Math.sqrt( vec3.length(nv1) )
			// / Math.sqrt( vec3.length(nv2) );
		
		
	// }
	
	public static getAxial( dimension: [number,number,number] = [512,512,512] ){
		return {
			origin: [0,0, dimension[2] / 2 ],
			xAxis: [dimension[0],0,0],
			yAxis: [0,dimension[1],0]
		};
	}
	public static getSagittal( dimension: [number,number,number] = [512,512,512] ){
		return {
			origin: [dimension[0] / 2, 0, 0 ],
			xAxis: [ 0, dimension[1], 0 ],
			yAxis: [ 0, 0 ,dimension[2] ]
		};
	}
	public static getCoronal( dimension: [number,number,number] = [512,512,512] ){
		return {
			origin: [ 0, dimension[1] / 2, 0 ],
			xAxis: [ dimension[0], 0, 0 ],
			yAxis: [ 0, 0 ,dimension[2] ]
		};
	}
	
	public static getEndPointsOfCrossLine( section1, section2 ){
		let nv1 = vec3.cross( vec3.create(), section1.xAxis, section1.yAxis );
		let nv2 = vec3.cross( vec3.create(), section2.xAxis, section2.yAxis );
		let nv = vec3.cross( vec3.create(), nv1, nv2 );
		
		console.log(nv);
	}
	
	
	public static getZoom( section1, section2 ){
	}
	
	public static getTranslate( section1, section2 ){
	}
	
	
	
	
	public static getVoxelMapperMatrix( section, viewport ){
		
		let nv = CrossSectionUtil.normalVector( section );
		
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
	
	public static getPixelToVoxelMapper( section, viewport ){
		let matrix = CrossSectionUtil.getVoxelMapperMatrix( section, viewport );
		return function( x: number,y: number,z: number = 0 ){
			let p = vec3.fromValues( x, y, z );
			vec3.transformMat4( p, p, matrix );
			return p;
		};
	}
	
	public static getVoxelToPixelMapper( section, viewport ){
		let matrix = CrossSectionUtil.getVoxelMapperMatrix( section, viewport );
		let inverse = mat4.invert( mat4.create(), matrix );
		return function(x: number,y: number,z: number){
			let p = vec3.fromValues( x, y, z );
			vec3.transformMat4( p, p, inverse );
			return p;
		};
	}
	
	
}