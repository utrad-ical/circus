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
	 * viewport 位置 ( x, y ) を voxel-index 系に変換
	 * 端数処理はされないことに注意
	 */
	private getMapper(){
		
		let resolution = this.resolution;
		let section = this.section;
		
		let o = section.origin;
		let u = vec3.scale( vec3.create(), section.xAxis, 1 / resolution[0] );
		let v = vec3.scale( vec3.create(), section.yAxis, 1 / resolution[1] );
		let voxelSize = this.cloud.getVoxelDimension();
		
		return function( x: number,y: number ){
			return [
				o[0] + u[0] / voxelSize[0] * x + v[0] / voxelSize[0] * y,
				o[1] + u[1] / voxelSize[1] * x + v[1] / voxelSize[1] * y,
				o[2] + u[2] / voxelSize[2] * x + v[2] / voxelSize[2] * y
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
		
		console.log( 'move to ' + this.check( [ ex, ey] ) );
		
		// this.nibs = this.createNibs( ex, ey );
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
		p0: [number,number,number],
		p1: [number,number,number]
	){
		let e = vec3.normalize( vec3.create(), [ p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2] ] );
		let distance = vec3.length( [ p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2] ] );
		let walked = 0.0;
		
		let nv = vec3.cross( vec3.create(), this.section.xAxis, this.section.yAxis );
		let vs = this.cloud.getDimension();
		nv = [ nv[0] * vs[0], nv[1] * vs[1], nv[2] * vs[2] ];
		let ew = vec3.normalize( nv, vec3.cross( nv, e, nv ) );
		
		let pi = p0.concat();
		do{
			this.cloud.writePixelAt( 1, Math.floor( pi[0] ), Math.floor( pi[1] ), Math.floor( pi[2] ) );
			
			let nib = pi.concat();
			let nib_walk = 0;
			let nib_distance = 10; // voxelsize補正されていない!!!
			while( nib_walk < nib_distance ){
				this.cloud.writePixelAt( 1, Math.floor( nib[0] ), Math.floor( nib[1] ), Math.floor( nib[2] ) );
				let nib_step = this.getStepToNeighbor( nib, ew );
				vec3.add( nib, nib, nib_step );
				nib_walk += vec3.length( nib_step );
			}
			
			let step = this.getStepToNeighbor( pi, e );
			pi[0] += step[0];
			pi[1] += step[1];
			pi[2] += step[2];
			walked += vec3.length( step );
			
		}while( walked < distance );

		this.cloud.writePixelAt( 1, Math.floor( p1[0] ), Math.floor( p1[1] ), Math.floor( p1[2] ) ); // 誤差吸収
	}
	
	/**
	 * ビュー上の特定長方形を構成するボクセル座標すべてに対して処理
	 */
	private eachVoxelsOnRect( vx, vy, w, h, f ){
		console.log('eachVoxelsOnRect');
		let o = this.mapper( vx, vy );
		let endx = this.mapper( vx + w, vy );
		let endy = this.mapper( vx, vy + h );
		let endxy = this.mapper( vx + w, vy + h );
		
		let u = [ endx[0] - o[0], endx[1] - o[1], endx[2] - o[2] ];
		let v = [ endy[0] - o[0], endy[1] - o[1], endy[2] - o[2] ];
		
		let eu = vec3.normalize( vec3.create(),　u );
		let ev = vec3.normalize( vec3.create(),　v );
		
		let u_distance = vec3.length( u );
		let u_walker;
		let v_distance = vec3.length( v );
		let v_walker = o;
		let v_step, u_step;
		let u_walk;
		
		let safe = 0xff * 0xff;
		let v_walk = 0.0;
		while( v_walk < v_distance ){
			if( safe-- < 0 ) throw 'ERROR v';
			u_walker = v_walker.concat();
			u_walk = 0.0;
			while( u_walk < u_distance ){
				if( safe-- < 0 ) throw 'ERROR u';
				f( u_walker.concat() );
				u_step = this.getStepToNeighbor( u_walker, eu );
				u_walk += vec3.length( u_step );
				vec3.add( u_walker, u_walker, u_step );
			}
			v_step = this.getStepToNeighbor( v_walker, ev );
			v_walk += vec3.length( v_step );
			vec3.add( v_walker, v_walker, v_step );
		}
		
	}
	
	/**
	 * 隣接するボクセルを取得
	 *   e方向に最も近い次の格子点へ進むためのベクトルを返す
	 * @param pos 
	 * @param e unit vector of toward
	 * @return p {number} neighbor pos.
	 */
	private getStepToNeighbor( pos, e ){
		let stepLength = [ 
			this.nextLatticeDistance( pos[0], e[0] ),
			this.nextLatticeDistance( pos[1], e[1] ),
			this.nextLatticeDistance( pos[2], e[2] )
		].reduce( (prev, cur) => {
			return cur === null ? prev : ( prev < cur ? prev : cur );
		}, Number.POSITIVE_INFINITY );
		
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
		let i = Math.floor(p);
		if( p === i ) return 1;
		return u < 0
			? Math.abs( p - i ) / Math.abs( u )
			: ( 1 - Math.abs( p - i ) ) / Math.abs( u );
	}
	
	
	private createNibs( vx, vy ){
		
		let voxelSize = this.cloud.getVoxelDimension();
		let section = this.section;
		let penWidth = this.penWidth;

		let o = this.mapper( Math.floor(vx), Math.floor(vy) );
		
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
		
		let startPos = this.mapper( ex, ey );
		
		let section = this.section;
		
		let vs = this.cloud.getVoxelDimension();
		let dim = this.cloud.getDimension();
		let bounds = [ vs[0] * dim[0], vs[1] * dim[1], vs[2] * dim[2] ];

		// だめ
		let eu = vec3.scale( vec3.create(), section.xAxis, Math.min( vs[0], vs[1], vs[2] ) / vec3.length(section.xAxis) );
		let ev = vec3.scale( vec3.create(), section.yAxis, Math.min( vs[0], vs[1], vs[2] ) / vec3.length(section.yAxis) );
		let failSafe = 1024;
		
		/**
		 * prepare point handle functions
		 */
		let copy = (p) => vec3.clone( p );
		let left = (p) => {
			vec3.subtract( p, p, eu );
			return p;
		};
		let right = (p) => {
			vec3.add( p, p, eu );
			return p;
		};
		let up = (p) => {
			vec3.subtract( p, p, ev )
			return p;
		};
		let down = (p) => {
			vec3.add( p, p, ev );
			return p;
		};
		let isBroken = (p) => {
			return p[0] < 0 || p[1] < 0 || p[2] < 0 || bounds[0] < p[0] || bounds[1] < p[1] || bounds[2] < p[2];
		};
		let isEdge = (p) => {
			return !!this.cloud.mmReadPixelAt( p[0], p[1], p[2] );
		};
		
		/**
		 * scanned data buffer
		 */
		let POINT_BYTES = 3;
		let lineBufferOffset = 0;
		// let lineBufferSize = Math.ceil( Uint16Array.BYTES_PER_ELEMENT * POINT_BYTES * Math.max( vec3.length( section.xAxis ), vec3.length( section.yAxis ) ) / unit );
		let lineBufferSize = Math.ceil( Uint16Array.BYTES_PER_ELEMENT * POINT_BYTES * Math.max( vec3.length( section.xAxis ), vec3.length( section.yAxis ) ) );
		let lineBuffer = new Uint16Array( lineBufferSize );
		let flushedLines =  [];
		
		let save = (p) => {
			lineBuffer[lineBufferOffset++] = Math.floor(p[0]);
			lineBuffer[lineBufferOffset++] = Math.floor(p[1]);
			lineBuffer[lineBufferOffset++] = Math.floor(p[2]);
		};
		let flush = () => {
			if( lineBufferOffset > 0 ){
				
				flushedLines.push( lineBuffer.slice( 0, lineBufferOffset ) );
				
				/*
				while( lineBufferOffset > 0 ){
					let pz = lineBuffer[ --lineBufferOffset ];
					let py = lineBuffer[ --lineBufferOffset ];
					let px = lineBuffer[ --lineBufferOffset ];
					this.cloud.mmWritePixelAt( 1, px, py, pz );
				}
				*/
				
				let ez = lineBuffer[ --lineBufferOffset ];
				let ey = lineBuffer[ --lineBufferOffset ];
				let ex = lineBuffer[ --lineBufferOffset ];
				if( lineBufferOffset === 0 ){
					this.cloud.mmWritePixelAt( 1, ex, ey, ez );
				}else{
					let sx = lineBuffer[ 0 ];
					let sy = lineBuffer[ 1 ];
					let sz = lineBuffer[ 2 ];
					
					this.line( [sx,sy,sz], [ez,ey,ez] );
					console.log( [sx,sy,sz].toString() );
				}
				lineBufferOffset = 0;
				if( --failSafe < 0 ) throw 'Fail safe on flush';
				
				
			}
		};

		
		/**
		 * scan line 
		 */
		let scanLine = (pos) => {
			
			if( isEdge(pos) ) return true;
			
console.log('Scan line from ' + '[' + pos.toString() + ']' );
				
			let p = copy(pos);
			let brokenPath = false;
			
			// lineBufferを座標集合で利用するために一旦最も左に向い、その後右に走るため、動作は遅くなる。
			MOVE_LEFT: while( true ){
				if( --failSafe < 0 ) throw 'Fail safe on MOVE_LEFT';
				
				left(p);
				switch( true ){
					case isBroken(p):
console.log(' - move left, broken at ' + '[' + p.toString() + ']' );
						brokenPath = true;
						break MOVE_LEFT;
					case isEdge(p):
console.log(' - move left, edge at ' + '[' + p.toString() + ']' );
						break MOVE_LEFT;
					default: 
				}
			}
			if( brokenPath ) return false;
			
			CORRECT_POINT_MOVING_RIGHT: while( true ){
				if( --failSafe < 0 ) throw 'Fail safe on CORRECT_POINT_MOVING_RIGHT';

				right(p);
				switch( true ){
					case isBroken(p): brokenPath = true; break CORRECT_POINT_MOVING_RIGHT;
					case isEdge(p): break CORRECT_POINT_MOVING_RIGHT;
					default: save(p);
				}
			}
			if( brokenPath ) return false;
			
			let o = lineBufferOffset;
			let upperOnEdge = true;
			let underOnEdge = true;
			
			UPPER_UNDER_SCAN: while( o > 0 ){
				let pz = lineBuffer[ --o ];
				let py = lineBuffer[ --o ];
				let px = lineBuffer[ --o ];

				let upper = up( [ px, py, pz ] );
				switch( true ){
					case isBroken(upper):
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case upperOnEdge && !isEdge(upper):
						upperOnEdge = false;
						buffer.push(upper);
						break;
					case !upperOnEdge && isEdge(upper):
						upperOnEdge = true;
						break;
					default:
						upperOnEdge = isEdge(upper);
				}
				
				let under = down( [ px, py, pz ] );
				switch( true ){
					case isBroken(under):
						brokenPath = true;
						break UPPER_UNDER_SCAN;
					case underOnEdge && !isEdge(under):
						underOnEdge = false;
						buffer.push(under);
						break;
					case !underOnEdge && isEdge(under):
						underOnEdge = true;
						break;
					default:
				}
			}
			if( brokenPath ) return false;

			flush();
			return true;
		};

		let result = true;
		let buffer = [ startPos ];
		while( result && buffer.length > 0 ){
			result = scanLine( buffer.shift() );
			if( failSafe-- < 0 ) throw 'Fail safe on scanLine loop';
		}
		
		// Broken path, revert filled points.
		if( !result ){
			let pointsBuffer;
			while( pointsBuffer = flushedLines.shift() ){
				for( let i = 0; i < pointsBuffer.length; i += POINT_BYTES ){
					this.cloud.writePixelAt( 0, pointsBuffer[ i ], pointsBuffer[ i+1 ], pointsBuffer[ i+2 ] );
				}
			}
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

