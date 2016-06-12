'use strict';

let { vec3 } = require('gl-matrix');
import { EventEmitter } from 'events';

import { VoxelCloud }					from '../../../common/VoxelCloud';

export class CloudEditor extends EventEmitter {

	public cloud;
	public penWidth: number = 1;
	
	private mapper;
	private section;
	private resolution;
	private penX: number;
	private penY: number;

	protected nibs: [number,number,number][];
	
	public setCloud( cloud ){
		let before = cloud;
		this.cloud = cloud;
		this.emit( 'cloudchange', before, this.cloud );
		return before;
	}
	
	private map;
	
	public prepare( state ){
		this.section = state.section;
		this.resolution = state.resolution;
		this.mapper = this.getMapper();
		
		this.map = this.cloud.mmGetSectionMap(
			state.section.origin,
			state.section.xAxis,
			state.section.yAxis,
			state.resolution
		);
		
	}
	
	private getMapper(){
		
		let resolution = this.resolution;
		let section = this.section;
		
		let o = section.origin;
		let u = vec3.scale( vec3.create(), section.xAxis, 1 / resolution[0] );
		let v = vec3.scale( vec3.create(), section.yAxis, 1 / resolution[1] );
		
		return function( x: number,y: number,z: number = 0 ){
			return [
				o[0] + u[0] * x + v[0] * y,
				o[1] + u[1] * x + v[1] * y,
				o[2] + u[2] * x + v[2] * y
			]
		};
	}
	
	private check(p){
		let [x,y] = [ Math.floor(p[0]), Math.floor(p[1]) ];
		let ix = this.map.get( x, y );
		return '#('+ ( ix ? ix.toString() : 'null' ) + ') ' + 'vp@['+[x,y].toString()+'] ';
	}
	
	public moveTo( ex, ey ){
		this.penX = ex;
		this.penY = ey;
		
		console.log( 'move to ' + this.check( [ ex, ey] ) );
		
		// this.nibs = this.createNibs( ex, ey );
	}
	
	
	
	/**
	 * 直線を通過するすべてのvoxelを塗りつぶす
	 */
	 
	// index ベース
	// oblique の場合の考慮がされていない！！！
	private line( s: [number,number], e: [number,number] ){
		let [ sx, sy ] = [ Math.floor(s[0]), Math.floor(s[1]) ];
		let [ ex, ey ] = [ Math.floor(e[0]), Math.floor(e[1]) ];

		this.line2( s, e );
		this.line3( this.map.get(sx, sy), this.map.get(ex, ey) );

	}
	private line3( si: [number,number,number], ei: [number,number,number] ){

		let [vx, vy, vz] = this.cloud.getVoxelDimension();
		let [ dx, dy, dz ] = [ ei[0] - si[0], ei[1] - si[1], ei[2] - si[2] ];
		let count = Math.max( Math.abs(dx / vx), Math.abs(dy / vy), Math.abs(dz / vz) );
		let [ sx, sy, sz ] = [ dx / count, dy / count, dz / count ]; // step
		
		let [ x0, y0, z0 ] = si;
		for( let i = 0; i <= count; i++ ){
			let [ x1, y1, z1 ] = [ x0+sx, y0+sy, z0+sz ];
			this.cloud.writePixelAt( 1, Math.floor(x0), Math.floor(y0), Math.floor(z0) );
			[ x0, y0, z0 ] = [ x1, y1, z1 ];
		}
		this.cloud.writePixelAt( 1, ei[0], ei[1], ei[2] );
	}
	private line2( s: [number,number], e: [number,number] ){
		let [ sx, sy ] = [ Math.floor(s[0]), Math.floor(s[1]) ];
		let [ ex, ey ] = [ Math.floor(e[0]), Math.floor(e[1]) ];
		
		let [ dx, dy ] = [ ex - sx, ey - sy ];
		
		let count = Math.ceil( Math.max( Math.abs( dx ), Math.abs( dy ) ) );
		let [ step_x, step_y ] = [ dx / count, dy / count ];
		
		let [ px, py ] = [ sx, sy ];
		for( let i=0; i<count; i++){
			let [pxi, pyi] = [ Math.floor( px ), Math.floor( py ) ];
			let [ix, iy, iz] = this.map.get( pxi, pyi );
			this.cloud.writePixelAt( 1, ix, iy, iz );
			px += step_x;
			py += step_y;
		}
		
		let[ eix, eiy, eiz ] = this.map.get( ex, ey );
		
		this.cloud.writePixelAt( 1, eix, eiy, eiz );
		
	}
	private createNibs( vx, vy ){
		
		let voxelSize = this.cloud.getVoxelDimension();
		let section = this.section;
		let penWidth = this.penWidth;

		let o = this.map.get( Math.floor(vx), Math.floor(vy) );
		
		let eu = vec3.normalize( vec3.create(), section.xAxis );
		let ev = vec3.normalize( vec3.create(), section.yAxis );
		
		let step_len = Math.min( voxelSize[0], voxelSize[1], voxelSize[2] );
		let u_count = Math.floor( penWidth / step_len );
		let u_step = vec3.scale( vec3.create(), eu, step_len );
		let v_count = Math.floor( penWidth / step_len );
		let v_step = vec3.scale( vec3.create(), ev, step_len );
		
		let nibs = [];
		let negative = - Math.floor( penWidth / 2 );
		let start = [
			o[0] + ( eu[0] + ev[0] ) * negative,
			o[1] + ( eu[1] + ev[1] ) * negative,
			o[2] + ( eu[2] + ev[2] ) * negative ];
		
		let v_walker = start;
console.log('nibs');
		for( let j = 0; j < v_count; j++ ){
			let u_walker = v_walker.concat();
			
			let logTmp = [];
			for( let i = 0; i < u_count; i++ ){
				logTmp.push( u_walker.concat() );
				// ペン先を円にする場合はここに判定を追加 if( 中心からの距離が半径の内側 )
				nibs.push( u_walker.concat() );
				vec3.add( u_walker, u_walker, u_step );
			}
console.log( '(' + logTmp.length.toString() + ') ' + logTmp.map( n => '[' + this.cloud.mmIndexAt( n[0],n[1],n[2] ).toString() + ']' ).join(' , ') );
			vec3.add( v_walker, v_walker, v_step );
		}

		return nibs;
	}
	
	public lineTo( ex, ey ){
		this.line( [ this.penX, this.penY ], [ ex, ey ] );
		this.penX = ex;
		this.penY = ey;
	}
	public lineBy( dx, dy ){
		this.lineTo( this.penX + dx, this.penY + dy );
	}
	/**
	 * fill with Scanline Seed Fill Algorithm
	 *  重複に関する考慮と実装がされていない。効率化の余地あり。
	 */
	public fill( ex, ey ){
		

		let startPos = [ Math.floor(ex), Math.floor(ey) ];
		
		let vs = this.cloud.getVoxelDimension();
		let dim = this.cloud.getDimension();
		let bounds = [ vs[0] * dim[0], vs[1] * dim[1], vs[2] * dim[2] ];

		let failSafe = 1024 * 256;
		
		/**
		 * prepare point handle functions
		 */
		let copy = (p) => p.concat();
		let left = (p) => { --p[0]; return p; };
		let right = (p) => { ++p[0]; return p; };
		let up = (p) => { --p[1]; return p; };
		let down = (p) => { ++p[1]; return p; };
		let isBroken = (p) => {
			return p[0] < 0 || p[1] < 0 || p[2] < 0 || dim[0] <= p[0] || dim[1] <= p[1] || dim[2] <= p[2];
		};
		let isEdge = (p) => {
			let ix = this.map.get( Math.floor(p[0]), Math.floor(p[1]) );
			return !!this.cloud.getPixelAt( ix[0], ix[1], ix[2] );
		};

console.log( 'fill ' + this.check( [ ex, ey] ) );

		let flush = ( mostLeft, mostRight ) => {
			this.line( mostLeft, mostRight );
		};

		
		/**
		 * scan line 
		 */
		let scanLine = (pos) => {
			
			if( isEdge(pos) ) return true;
			
console.log('***************************** ' );
console.log(' Scan line from ' + this.check(pos) );
				
			let p = copy(pos);
			let brokenPath = false;
			
			// lineBufferを座標集合で利用するために一旦最も左に向い、その後右に走るため、動作は遅くなる。
			MOVE_LEFT: while( true ){
				if( --failSafe < 0 ) throw 'Fail safe on MOVE_LEFT';
				
				left(p);
				switch( true ){
					case isBroken(p):
console.log(' - move left, broken at ' + this.check(p) );
						brokenPath = true;
						break MOVE_LEFT;
					case isEdge(p):
console.log(' - move left, edge at ' + this.check(p) );
						right(p);
						break MOVE_LEFT;
					default: 
				}
			}
			if( brokenPath ) return false;
			let mostLeft = copy(p);

let dots = 0;
			CORRECT_POINT_MOVING_RIGHT: while( true ){
				if( --failSafe < 0 ) throw 'Fail safe on CORRECT_POINT_MOVING_RIGHT';

				right(p);
				switch( true ){
					case isBroken(p):
console.log(' - go right, broken at ' + this.check(p) );
						brokenPath = true;
						break CORRECT_POINT_MOVING_RIGHT;
					case isEdge(p):
console.log(' - go right, edge at ' + this.check(p) );
						left(p);
						break CORRECT_POINT_MOVING_RIGHT;
					default:
						++dots;
						// save(p);
				}
			}
			if( brokenPath ) return false;
			let mostRight = copy(p);
console.log(' - correct ' + dots.toString() + ' editor dots' );
			
			let upperOnEdge = true;
			let underOnEdge = true;
			
			UPPER_UNDER_SCAN: while( dots > 0 ){
				dots--;

				let upper = up( copy(p) );
				switch( true ){
					case isBroken(upper):
console.log(' - upper scan broken ' + this.check(upper) );
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case upperOnEdge && !isEdge(upper):
console.log(' - upper scan add buffer ' + this.check(upper) );
						upperOnEdge = false;
						buffer.push(upper);
						break;
					case !upperOnEdge && isEdge(upper):
						upperOnEdge = true;
						break;
					default:
						upperOnEdge = isEdge(upper);
				}
				
				let under = down( copy(p) );
				switch( true ){
					case isBroken(under):
console.log(' - under scan broken ' + this.check(under) );
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case underOnEdge && !isEdge(under):
console.log(' - under scan add buffer ' + this.check(under) );
						underOnEdge = false;
						buffer.push(under);
						break;
					case !underOnEdge && isEdge(under):
						underOnEdge = true;
						break;
					default:
				}
				left(p);
			}
			if( brokenPath ) return false;

console.log(' - flush from ' + this.check( mostLeft ) );
console.log(' - flush to   ' + this.check( mostRight ) );
			flush( mostLeft, mostRight );
			return true;
		};

		let result = true;
		let buffer = [ startPos ];
		while( result && buffer.length > 0 ){
			result = scanLine( buffer.shift() );
			console.log( 'buffer: ' + buffer.length.toString() );
			if( failSafe-- < 0 ) throw 'Fail safe on scanLine loop';
		}
		if( !result ){
console.log('**** BROKEN!!! ****');
		}
		
		/*
		// Broken path, revert filled points.
		if( !result ){
			let pointsBuffer;
			while( pointsBuffer = flushedLines.shift() ){
				for( let i = 0; i < pointsBuffer.length; i += POINT_BYTES ){
					this.cloud.writePixelAt( 0, pointsBuffer[ i ], pointsBuffer[ i+1 ], pointsBuffer[ i+2 ] );
				}
			}
		} 
		*/
		
		return result;
	}
	
	/**
	 * imageDataからcloudへ書き戻す( 利用していないのでコメントアウト )
	 */
	// public applyImage( imageData ) {
		
		// if( !this.cloud ) return;
		
		// let vpw = imageData.width, vph = imageData.height;
		// let image = imageData.data;
		
		// let imageOffset = 0;
		// for( let iy = 0; iy < vph; iy++ ){
			// for( let ix = 0; ix < vpw; ix++ ){
				// let alpha = image[ ( imageOffset << 2 ) + 3 ];
				// if( alpha > 0 ){
					// // console.log( '[ '+[ix,iy].toString() + ' ]' + ' #'+ imageOffset.toString() );
					// this.applyCanvasDot( ix, iy );
				// }
				// imageOffset++;
			// }
		// }
	// }
	
	/**
	 * canvas上の1点( ix, iy )が示す領域に対応する全てのボクセルを塗る( 利用していないのでコメントアウト )
	 */
	// private applyCanvasDot( ix,iy ){
		// // TODO: use voxel-size 

		// if( !this.cloud ) throw 'Target cloud is not set';
		
		// let po = this.mapper( ix, iy ); // 左上端点を含む座標
		// this.cloud.writePixelAt( 1, Math.floor(po[0]), Math.floor(po[1]), Math.floor(po[2]) );
		
		// let px = this.mapper( ix+1, iy ); // x方向
		// let py = this.mapper( ix, iy+1 ); // y方向
		// let pe = this.mapper( ix+1, iy+1 ); // xy方向
		
		// let v0 = [
			// Math.min( po[0], px[0], py[0], pe[0] ),
			// Math.min( po[1], px[1], py[1], pe[1] ),
			// Math.min( po[2], px[2], py[2], pe[2] )
		// ];
		// let v1 = [
			// Math.max( po[0], px[0], py[0], pe[0] ),
			// Math.max( po[1], px[1], py[1], pe[1] ),
			// Math.max( po[2], px[2], py[2], pe[2] )
		// ];
		
		// let v = vec3.clone( v0 );
		// while( v[0] <= v1[0] ){
			// v[1] = v0[1];
			// while( v[1] <= v1[1] ){
				// v[2] = v0[2];
				// while( v[2] <= v1[2] ){
					// this.cloud.writePixelAt( 1, Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2]) );
					// // console.log( vec3.str( [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])] ) );
					// v[2]++;
				// }
				// v[1]++;
			// }
			// v[0]++;
		// }
	// }

}

	// public fill( ex, ey ){
		
		// let startPos = this.mapper( ex, ey );
		
		// let section = this.section;
		
		// let vs = this.cloud.getVoxelDimension();
		// let dim = this.cloud.getDimension();
		// let bounds = [ vs[0] * dim[0], vs[1] * dim[1], vs[2] * dim[2] ];

		// // だめ
		// let eu = vec3.scale( vec3.create(), section.xAxis, Math.min( vs[0], vs[1], vs[2] ) / vec3.length(section.xAxis) );
		// let ev = vec3.scale( vec3.create(), section.yAxis, Math.min( vs[0], vs[1], vs[2] ) / vec3.length(section.yAxis) );
		// let failSafe = 1024;
		
		// /**
		 // * prepare point handle functions
		 // */
		// let copy = (p) => vec3.clone( p );
		// let left = (p) => {
			// vec3.subtract( p, p, eu );
			// return p;
		// };
		// let right = (p) => {
			// vec3.add( p, p, eu );
			// return p;
		// };
		// let up = (p) => {
			// vec3.subtract( p, p, ev )
			// return p;
		// };
		// let down = (p) => {
			// vec3.add( p, p, ev );
			// return p;
		// };
		// let isBroken = (p) => {
			// return p[0] < 0 || p[1] < 0 || p[2] < 0 || bounds[0] < p[0] || bounds[1] < p[1] || bounds[2] < p[2];
		// };
		// let isEdge = (p) => {
			// return !!this.cloud.mmReadPixelAt( p[0], p[1], p[2] );
		// };
		
		// /**
		 // * scanned data buffer
		 // */
		// let POINT_BYTES = 3;
		// let lineBufferOffset = 0;
		// // let lineBufferSize = Math.ceil( Uint16Array.BYTES_PER_ELEMENT * POINT_BYTES * Math.max( vec3.length( section.xAxis ), vec3.length( section.yAxis ) ) / unit );
		// let lineBufferSize = Math.ceil( Uint16Array.BYTES_PER_ELEMENT * POINT_BYTES * Math.max( vec3.length( section.xAxis ), vec3.length( section.yAxis ) ) );
		// let lineBuffer = new Uint16Array( lineBufferSize );
		// let flushedLines =  [];
		
		// let save = (p) => {
			// lineBuffer[lineBufferOffset++] = Math.floor(p[0]);
			// lineBuffer[lineBufferOffset++] = Math.floor(p[1]);
			// lineBuffer[lineBufferOffset++] = Math.floor(p[2]);
		// };
		// let flush = () => {
			// if( lineBufferOffset > 0 ){
				
				// flushedLines.push( lineBuffer.slice( 0, lineBufferOffset ) );
				
				// /*
				// while( lineBufferOffset > 0 ){
					// let pz = lineBuffer[ --lineBufferOffset ];
					// let py = lineBuffer[ --lineBufferOffset ];
					// let px = lineBuffer[ --lineBufferOffset ];
					// this.cloud.mmWritePixelAt( 1, px, py, pz );
				// }
				// */
				
				// let ez = lineBuffer[ --lineBufferOffset ];
				// let ey = lineBuffer[ --lineBufferOffset ];
				// let ex = lineBuffer[ --lineBufferOffset ];
				// if( lineBufferOffset === 0 ){
					// this.cloud.mmWritePixelAt( 1, ex, ey, ez );
				// }else{
					// let sx = lineBuffer[ 0 ];
					// let sy = lineBuffer[ 1 ];
					// let sz = lineBuffer[ 2 ];
					
					// this.line( [sx,sy,sz], [ez,ey,ez] );
					// console.log( [sx,sy,sz].toString() );
				// }
				// lineBufferOffset = 0;
				// if( --failSafe < 0 ) throw 'Fail safe on flush';
				
				
			// }
		// };

		
		// /**
		 // * scan line 
		 // */
		// let scanLine = (pos) => {
			
			// if( isEdge(pos) ) return true;
			
// console.log('Scan line from ' + '[' + pos.toString() + ']' );
				
			// let p = copy(pos);
			// let brokenPath = false;
			
			// // lineBufferを座標集合で利用するために一旦最も左に向い、その後右に走るため、動作は遅くなる。
			// MOVE_LEFT: while( true ){
				// if( --failSafe < 0 ) throw 'Fail safe on MOVE_LEFT';
				
				// left(p);
				// switch( true ){
					// case isBroken(p):
// console.log(' - move left, broken at ' + '[' + p.toString() + ']' );
						// brokenPath = true;
						// break MOVE_LEFT;
					// case isEdge(p):
// console.log(' - move left, edge at ' + '[' + p.toString() + ']' );
						// break MOVE_LEFT;
					// default: 
				// }
			// }
			// if( brokenPath ) return false;
			
			// CORRECT_POINT_MOVING_RIGHT: while( true ){
				// if( --failSafe < 0 ) throw 'Fail safe on CORRECT_POINT_MOVING_RIGHT';

				// right(p);
				// switch( true ){
					// case isBroken(p): brokenPath = true; break CORRECT_POINT_MOVING_RIGHT;
					// case isEdge(p): break CORRECT_POINT_MOVING_RIGHT;
					// default: save(p);
				// }
			// }
			// if( brokenPath ) return false;
			
			// let o = lineBufferOffset;
			// let upperOnEdge = true;
			// let underOnEdge = true;
			
			// UPPER_UNDER_SCAN: while( o > 0 ){
				// let pz = lineBuffer[ --o ];
				// let py = lineBuffer[ --o ];
				// let px = lineBuffer[ --o ];

				// let upper = up( [ px, py, pz ] );
				// switch( true ){
					// case isBroken(upper):
						// brokenPath = true;
						// break UPPER_UNDER_SCAN;
					// case upperOnEdge && !isEdge(upper):
						// upperOnEdge = false;
						// buffer.push(upper);
						// break;
					// case !upperOnEdge && isEdge(upper):
						// upperOnEdge = true;
						// break;
					// default:
						// upperOnEdge = isEdge(upper);
				// }
				
				// let under = down( [ px, py, pz ] );
				// switch( true ){
					// case isBroken(under):
						// brokenPath = true;
						// break UPPER_UNDER_SCAN;
					// case underOnEdge && !isEdge(under):
						// underOnEdge = false;
						// buffer.push(under);
						// break;
					// case !underOnEdge && isEdge(under):
						// underOnEdge = true;
						// break;
					// default:
				// }
			// }
			// if( brokenPath ) return false;

			// flush();
			// return true;
		// };

		// let result = true;
		// let buffer = [ startPos ];
		// while( result && buffer.length > 0 ){
			// result = scanLine( buffer.shift() );
			// if( failSafe-- < 0 ) throw 'Fail safe on scanLine loop';
		// }
		
		// // Broken path, revert filled points.
		// if( !result ){
			// let pointsBuffer;
			// while( pointsBuffer = flushedLines.shift() ){
				// for( let i = 0; i < pointsBuffer.length; i += POINT_BYTES ){
					// this.cloud.writePixelAt( 0, pointsBuffer[ i ], pointsBuffer[ i+1 ], pointsBuffer[ i+2 ] );
				// }
			// }
		// } 
		
		// return result;
	// }
