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
	
	public prepare( state ){
		this.section = state.section;
		this.resolution = state.resolution;
		this.mapper = this.getMapper();
	}
	
	/**
	 * viewport 位置 ( x, y ) を mm 系に変換
	 */
	private getMapper(){
		
		let resolution = this.resolution;
		let section = this.section;
		
		let o = section.origin;
		let u = vec3.scale( vec3.create(), section.xAxis, 1 / resolution[0] );
		let v = vec3.scale( vec3.create(), section.yAxis, 1 / resolution[1] );
		
		return function( x: number,y: number ){
			return [
				o[0] + u[0] * x + v[0] * y,
				o[1] + u[1] * x + v[1] * y,
				o[2] + u[2] * x + v[2] * y
			]
		};
	}
	
	private check(p){
		let [x,y] = [ Math.floor(p[0]), Math.floor(p[1]) ];
		let ix = this.mapper( x, y );
		return '#('+ ( ix ? ix.toString() : 'null' ) + ') ' + 'vp@['+[x,y].toString()+'] ';
	}
	
	public moveTo( ex, ey ){
		this.penX = ex;
		this.penY = ey;
	}
	
	
	
	/**
	 * 直線を通過するすべてのvoxelを塗りつぶす
	 */
	 
	private line( s: [number,number], e: [number,number] ){
		this.mmLine3(
			this.mapper(s[0],s[1]),
			this.mapper(e[0],e[1])
		);
	}

	private mmLine3(
		p0_mm: [number,number,number],
		p1_mm: [number,number,number]
	){
		let vs = this.cloud.getVoxelDimension();
		// let p0 = this.cloud.mmIndexAt( p0_mm[0], p0_mm[1], p0_mm[2] );
		// let p1 = this.cloud.mmIndexAt( p1_mm[0], p1_mm[1], p1_mm[2] );
		let p0 = [ p0_mm[0] / vs[0], p0_mm[1] / vs[1], p0_mm[2] / vs[2] ];
		let p1 = [ p1_mm[0] / vs[0], p1_mm[1] / vs[1], p1_mm[2] / vs[2] ];
		
		let e = vec3.normalize( vec3.create(), [ p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2] ] );
		let distance = vec3.length( [ p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2] ] );
		let walked = 0.0;
		
		let pi = p0.concat();
		
		let trim_x = e[0] < 0
			? (i) => i === Math.floor( i ) ? i - 1 : Math.floor(i)
			: (i) => Math.floor(i);
		let trim_y = e[1] < 0
			? (i) => i === Math.floor( i ) ? i - 1 : Math.floor(i)
			: (i) => Math.floor(i);
		let trim_z = e[2] < 0
			? (i) => i === Math.floor( i ) ? i - 1 : Math.floor(i)
			: (i) => Math.floor(i);
		
		
		do{
			this.cloud.writePixelAt( 1, trim_x(pi[0]), trim_y(pi[1]), trim_z(pi[2]) );
			
			let step = this.getStepToNeighbor( pi, e );
// console.log('pi: '+vec3.str(pi));
			vec3.add( pi, pi, step );
			walked += vec3.length( step );
			
		}while( walked < distance );

		this.cloud.writePixelAt( 1, Math.floor( p1[0] ), Math.floor( p1[1] ), Math.floor( p1[2] ) ); // 誤差吸収
	}
	
	/**
	 * ビュー上の特定長方形を構成するボクセル座標すべてに対して処理
	 */
	private eachVoxelsOnRect3( o, u, v, f ){
		
		// voxel-index系に変換
		let vs = this.cloud.getVoxelDimension();
		o = [ o[0] / vs[0], o[1] / vs[1], o[2] / vs[2] ];
		u = [ u[0] / vs[0], u[1] / vs[1], u[2] / vs[2] ];
		v = [ v[0] / vs[0], v[1] / vs[1], v[2] / vs[2] ];
		
		let eu = vec3.normalize( vec3.create(),　u );
		let ev = vec3.normalize( vec3.create(),　v );
		
		let u_distance = vec3.length( u );
		let u_walker;
		let v_distance = vec3.length( v );
		let v_walker = [ o[0]+0.5, o[1]+0.5, o[2]+0.5 ];
		let v_step, u_step;
		let u_walk;
		
		let safe = 0xff * 0xff * 10;
		let v_walk = 0.0;
		while( v_walk < v_distance ){
			if( safe-- < 0 ) throw 'ERROR v';
			u_walker = v_walker.concat();
			u_walk = 0.0;
			while( u_walk < u_distance ){
				if( safe-- < 0 ) throw 'ERROR u';
				f( u_walker.concat() );
				u_step = this.getStepToNeighbor( u_walker, eu );
if( vec3.length( u_step ) === 0 ) throw "WHAT'S UP!?";
				u_walk += vec3.length( u_step );
				vec3.add( u_walker, u_walker, u_step );
			}
			v_step = this.getStepToNeighbor( v_walker, ev );
			v_walk += vec3.length( v_step );
			vec3.add( v_walker, v_walker, v_step );
		}
	}
	private eachVoxelsOnRect2( vx, vy, w, h, f ){
// console.log('eachVoxelsOnRect (' + vx.toString() + ',' + vy.toString() + ', ' + w.toString() + 'x' + h.toString() +   ')');
		let o = this.mapper( vx, vy );
		let endx = this.mapper( vx + w, vy );
		let endy = this.mapper( vx, vy + h );

		let u = [ endx[0] - o[0], endx[1] - o[1], endx[2] - o[2] ];
		let v = [ endy[0] - o[0], endy[1] - o[1], endy[2] - o[2] ];
		
		this.eachVoxelsOnRect3( o, u, v, f );
	}
	
	/**
	 * 隣接するボクセルを取得
	 *   e方向に最も近い次へ進むためのベクトルを返す
	 * @param pos 
	 * @param e toward unit vector
	 * @param vs voxel-size
	 * @return p {number} neighbor pos.
	 */
	private getStepToNeighbor( pos, e ){
		let stepLengthEntry = [ 
			this.nextLatticeDistance( pos[0], e[0] ),
			this.nextLatticeDistance( pos[1], e[1] ),
			this.nextLatticeDistance( pos[2], e[2] )
		];
		
		stepLengthEntry = stepLengthEntry.filter( (i) => i !== null );
		
		let stepLength = stepLengthEntry.reduce( (prev, cur) => {
			return cur === null ? prev : ( prev < cur ? prev : cur );
		}, Number.POSITIVE_INFINITY );
		
// console.log( stepLength.toString() + ' / ' + vec3.str( stepLengthEntry) );
		
		return [
			e[0] * stepLength,
			e[1] * stepLength,
			e[2] * stepLength ];
	}
	/**
	 * 次の格子点までの距離を取得
	 * 対象1次元
	 * @param p 現在地点
	 * @param u 格子の方向兼幅
	 */
	private nextLatticeDistance( p, u ) {
		if( u === 0 ) return null;
		let i = u < 0 ? Math.floor(p) : Math.ceil(p);
		if( p === i ) return Math.abs( 1 / u );
		
		return Math.abs( ( p - i ) / u );
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
		return this.fillWithScanOblique( ex, ey );
		// return this.fillWithRawSection( ex, ey );
	}
	public fillWithScanOblique( ex, ey ){

let verbose = true;
		let startPos = [ Math.floor(ex), Math.floor(ey) ];

if( verbose ) console.log( 'fill ' + this.check( startPos ) );

		let vs = this.cloud.getVoxelDimension();
		let o = this.section.origin;
		let size = this.resolution;
		let u = this.section.xAxis.map( (i) => i / size[0] );
		let v = this.section.yAxis.map( (i) => i / size[1] );
		
		let imageBuffer = new Uint8Array( size[0] * size[1] );
		this.cloud.scanOblique(
			[ o[0] / vs[0], o[1] / vs[1], o[2] / vs[2] ],
			[ u[0] / vs[0], u[1] / vs[1], u[2] / vs[2] ],
			[ v[0] / vs[0], v[1] / vs[1], v[2] / vs[2] ],
			size as any,
			imageBuffer,
			1, 0.5
		);

		let value = 1;
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
			return p[0] < 0 || p[1] < 0 || size[0] <= p[0] || size[1] <= p[1];
		};
		let isEdge = (p) => {
			return !! imageBuffer[ Math.floor(p[1]) * size[0] + Math.floor(p[0]) ]
				|| !!imageBuffer[ Math.floor(p[1]) * size[0] + Math.ceil(p[0]) ]
				|| !!imageBuffer[ Math.ceil(p[1]) * size[0] + Math.floor(p[0]) ]
				|| !!imageBuffer[ Math.ceil(p[1]) * size[0] + Math.ceil(p[0]) ] ;
		};

		let fillFuncArgs = [];
		let flush = ( mostLeft, mostRight ) => {
			fillFuncArgs.push(
				[ mostLeft[0]-1, mostLeft[1]-1, mostRight[0] - mostLeft[0] +1, mostRight[1] - mostLeft[1] +1 ]
			);
			
			let y = mostLeft[1];
			for( let x = mostLeft[0]; x<=mostRight[0]; x++ ){
				imageBuffer[ y * size[1] + x ] = 1
			}
		};

		/**
		 * scan line 
		 */
		let scanLine = (pos) => {
			
			if( isEdge(pos) ) return true;
			
if( verbose ) console.log('***************************** ' );
if( verbose ) console.log(' Scan line from ' + this.check(pos) );
				
			let p = copy(pos);
			let brokenPath = false;
			
			// lineBufferを座標集合で利用するために一旦最も左に向い、その後右に走るため、動作は遅くなる。
			MOVE_LEFT: while( true ){
				if( --failSafe < 0 ) throw 'Fail safe on MOVE_LEFT';
				
				left(p);
				switch( true ){
					case isBroken(p):
if( verbose ) console.log(' - move left, broken at ' + this.check(p) );
						brokenPath = true;
						break MOVE_LEFT;
					case isEdge(p):
if( verbose ) console.log(' - move left, edge at ' + this.check(p) );
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
if( verbose ) console.log(' - go right, broken at ' + this.check(p) );
						brokenPath = true;
						break CORRECT_POINT_MOVING_RIGHT;
					case isEdge(p):
if( verbose ) console.log(' - go right, edge at ' + this.check(p) );
						left(p);
						break CORRECT_POINT_MOVING_RIGHT;
					default:
						++dots;
						// save(p);
				}
			}
			if( brokenPath ) return false;
			let mostRight = copy(p);
if( verbose ) console.log(' - correct ' + dots.toString() + ' editor dots' );
			
			let upperOnEdge = true;
			let underOnEdge = true;
			
			UPPER_UNDER_SCAN: while( dots > 0 ){
				dots--;

				let upper = up( copy(p) );
				switch( true ){
					case isBroken(upper):
if( verbose ) console.log(' - upper scan broken ' + this.check(upper) );
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case upperOnEdge && !isEdge(upper):
if( verbose ) console.log(' - upper scan add buffer ' + this.check(upper) );
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
if( verbose ) console.log(' - under scan broken ' + this.check(under) );
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case underOnEdge && !isEdge(under):
if( verbose ) console.log(' - under scan add buffer ' + this.check(under) );
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

if( verbose ) console.log(' - flush from ' + this.check( mostLeft ) );
if( verbose ) console.log(' - flush to   ' + this.check( mostRight ) );
			flush( mostLeft, mostRight );
			return true;
		};

		let result = true;
		let buffer = [ startPos ];
		while( result && buffer.length > 0 ){
			result = scanLine( buffer.shift() );
if( verbose ) console.log( 'buffer: ' + buffer.length.toString() );
			if( failSafe-- < 0 ) throw 'Fail safe on scanLine loop';
		}
		if( result ){
			let fillFunc = ( p ) => this.cloud.writePixelAt( 1, Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]) );
			fillFuncArgs.forEach( 
				a => this.eachVoxelsOnRect2( a[0], a[1], a[2], a[3], fillFunc )
			);
		}else{
if( verbose ) console.log('**** BROKEN!!! ****');
		}
		
		return result;
	}


	public fillWithRawSection( ex, ey ){

		let startPos = [ Math.floor(ex), Math.floor(ey) ];
let verbose = true;
if( verbose ) console.log( 'fill ' + this.check( startPos ) );

		let rawSection = this.cloud.mmGetSection(
			this.section.origin,
			this.section.xAxis,
			this.section.yAxis,
			this.resolution,
			false
		);
		// let eu = vec3.scale( vec3.create(),　this.section.xAxis, 1 / this.resolution[0] );
		// let ev = vec3.scale( vec3.create(),　this.section.yAxis, 1 / this.resolution[1] );
		let value = 1;

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
			return p[0] < 0 || p[1] < 0 || rawSection.width <= p[0] || rawSection.height <= p[1];
		};
		let isEdge = (p) => {
			return !!rawSection.getPixelAt( p[0], p[1] );
		};

		let fillFuncArgs = [];
		let flush = ( mostLeft, mostRight ) => {
			fillFuncArgs.push(
				[ mostLeft[0]-1, mostLeft[1]-1, mostRight[0] - mostLeft[0] +1, mostRight[1] - mostLeft[1] +1 ]
			);
			
			let y = mostLeft[1];
			for( let x = mostLeft[0]; x<=mostRight[0]; x++ ){
				rawSection.writePixelAt( x, y, value );
			}
		};

		
		/**
		 * scan line 
		 */
		let scanLine = (pos) => {
			
			if( isEdge(pos) ) return true;
			
if( verbose ) console.log('***************************** ' );
if( verbose ) console.log(' Scan line from ' + this.check(pos) );
				
			let p = copy(pos);
			let brokenPath = false;
			
			// lineBufferを座標集合で利用するために一旦最も左に向い、その後右に走るため、動作は遅くなる。
			MOVE_LEFT: while( true ){
				if( --failSafe < 0 ) throw 'Fail safe on MOVE_LEFT';
				
				left(p);
				switch( true ){
					case isBroken(p):
if( verbose ) console.log(' - move left, broken at ' + this.check(p) );
						brokenPath = true;
						break MOVE_LEFT;
					case isEdge(p):
if( verbose ) console.log(' - move left, edge at ' + this.check(p) );
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
if( verbose ) console.log(' - go right, broken at ' + this.check(p) );
						brokenPath = true;
						break CORRECT_POINT_MOVING_RIGHT;
					case isEdge(p):
if( verbose ) console.log(' - go right, edge at ' + this.check(p) );
						left(p);
						break CORRECT_POINT_MOVING_RIGHT;
					default:
						++dots;
						// save(p);
				}
			}
			if( brokenPath ) return false;
			let mostRight = copy(p);
if( verbose ) console.log(' - correct ' + dots.toString() + ' editor dots' );
			
			let upperOnEdge = true;
			let underOnEdge = true;
			
			UPPER_UNDER_SCAN: while( dots > 0 ){
				dots--;

				let upper = up( copy(p) );
				switch( true ){
					case isBroken(upper):
if( verbose ) console.log(' - upper scan broken ' + this.check(upper) );
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case upperOnEdge && !isEdge(upper):
if( verbose ) console.log(' - upper scan add buffer ' + this.check(upper) );
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
if( verbose ) console.log(' - under scan broken ' + this.check(under) );
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case underOnEdge && !isEdge(under):
if( verbose ) console.log(' - under scan add buffer ' + this.check(under) );
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

if( verbose ) console.log(' - flush from ' + this.check( mostLeft ) );
if( verbose ) console.log(' - flush to   ' + this.check( mostRight ) );
			flush( mostLeft, mostRight );
			return true;
		};

		let result = true;
		let buffer = [ startPos ];
		while( result && buffer.length > 0 ){
			result = scanLine( buffer.shift() );
if( verbose ) console.log( 'buffer: ' + buffer.length.toString() );
			if( failSafe-- < 0 ) throw 'Fail safe on scanLine loop';
		}
		if( result ){
			let fillFunc = ( p ) => this.cloud.writePixelAt( 1, Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]) );
			fillFuncArgs.forEach( 
				a => this.eachVoxelsOnRect2( a[0], a[1], a[2], a[3], fillFunc )
			);
		}else{
if( verbose ) console.log('**** BROKEN!!! ****');
		}
		
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

export class PointsBuffer {

	private length: number = 0;
	private offset: number = 0;
	private view: {[offset: number]: number};
	
	private v_null: number = 0;
	private x_mask: number = 0;
	private y_mask: number = 0;
	private z_mask: number = 0;
	
	constructor( length ){
		this.length = length;
		this.offset = 0;
		this.view = new Uint32Array( length );
		this.x_mask = parseInt('00000000000000000000011111111110', 2);
		this.y_mask = parseInt('00000000000111111111100000000000', 2);
		this.z_mask = parseInt('01111111111000000000000000000000', 2);
	};

	/**
	 * フォーマット
	 * -------------------------------------
	 * 0		(1bit)	: not null フラグ
	 * 1-10		(10bit)	: x座標 (最大 1023)
	 * 11-20	(10bit)	: y座標 (最大 1023)
	 * 21-30	(10bit)	: z座標 (最大 1023)
	 */
	
	private pack( x: number, y: number, z: number ): number {
		if( x < 0 || 1023 < x || y < 0 || 1023 < y || z < 0 || 1023 < z ) throw new Error('Out of range');
		return 1 | ( x << 1 ) | ( y << 11 ) | ( z << 21 );
	}
	private unpack( value: number ){
		if( value === this.v_null ) return null;
		return [
			( value & this.x_mask ) >> 1 ,
			( value & this.y_mask ) >> 11 ,
			( value & this.z_mask ) >> 21
		];
	}
	
	public push( p: [ number, number, number ] ){
		this.view[ this.offset++ ] = p === null ? this.v_null : this.pack( p[0], p[1], p[2] );
	}
	public shift(){
		if( this.offset > 0 ){
			return this.unpack( this.view[ --this.offset ] );
		}else{
			return null;
		}
	}
	public rewind(){
		this.offset = 0;
	}
	
}

