'use strict';

let {vec2, vec3} = require('gl-matrix');

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
