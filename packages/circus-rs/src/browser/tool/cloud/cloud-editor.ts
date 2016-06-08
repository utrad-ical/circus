'use strict';

let { vec3 } = require('gl-matrix');
import { EventEmitter } from 'events';

import { VoxelCloud }					from '../../../common/VoxelCloud';

export class CloudEditor extends EventEmitter {

	public cloud;
	public penWidth: number = 1;
	
	private mapper;
	private section;
	private viewport;
	private penX: number;
	private penY: number;

	protected nibs: [number,number,number][];
	
	public setCloud( cloud ){
		let before = cloud;
		this.cloud = cloud;
		this.emit( 'cloudchange', before, this.cloud );
		return before;
	}
	
	public prepare( section, viewport ){
		this.section = section;
		this.viewport = viewport;
		this.mapper = this.getMapper();
	}
	
	private getMapper(){
		
		let viewport = this.viewport;
		let section = this.section;
		
		let o = section.origin;
		let u = vec3.scale( vec3.create(), section.xAxis, 1 / viewport[0] );
		let v = vec3.scale( vec3.create(), section.yAxis, 1 / viewport[1] );
		
		return function( x: number,y: number,z: number = 0 ){
			return [
				o[0] + u[0] * x + v[0] * y,
				o[1] + u[1] * x + v[1] * y,
				o[2] + u[2] * x + v[2] * y
			]
		};
	}
	
	public moveTo( ex, ey ){
		this.penX = ex;
		this.penY = ey;
		this.nibs = this.createNibs( ex, ey );
	}
	
	private createNibs( ex, ey ){
		
		let section = this.section;
		let ix = ex;
		let iy = ey;
		let penWidth = this.penWidth;

		let o1 = this.mapper( ix, iy );
		let o2 = this.mapper( ix+1, iy+1 );
		let o = [
			( o1[0] + o2[0] ) / 2,
			( o1[1] + o2[1] ) / 2,
			( o1[2] + o2[2] ) / 2,
		];
		
		let eu = vec3.normalize( vec3.create(), section.xAxis );
		let ev = vec3.normalize( vec3.create(), section.yAxis );
		
		let po = [
			o[0] - ( eu[0] + ev[0] ) * penWidth / 2,
			o[1] - ( eu[1] + ev[1] ) * penWidth / 2,
			o[2] - ( eu[2] + ev[2] ) * penWidth / 2 ];
		let px = vec3.add( vec3.create(), o, vec3.scale( vec3.create(), eu, penWidth / 2  ) ); // x方向
		let py = vec3.add( vec3.create(), o, vec3.scale( vec3.create(), ev, penWidth / 2  ) ); // y方向
		let pe = vec3.add( vec3.create(), px, vec3.scale( vec3.create(), ev, penWidth / 2 ) ); // xy方向
		
		let v0 = [
			Math.min( po[0], px[0], py[0], pe[0] ),
			Math.min( po[1], px[1], py[1], pe[1] ),
			Math.min( po[2], px[2], py[2], pe[2] )
		];
		let v1 = [
			Math.max( po[0], px[0], py[0], pe[0] ),
			Math.max( po[1], px[1], py[1], pe[1] ),
			Math.max( po[2], px[2], py[2], pe[2] )
		];
		
		let vs = this.cloud.getVoxelDimension();
		
		let nibs = [];
		let seen = {};
		let seenKey = (p) => p.map( i => i.toString() ).join(',');
		
		let v = vec3.clone( v0 );
		while( v[0] <= v1[0] ){
			v[1] = v0[1];
			while( v[1] <= v1[1] ){
				v[2] = v0[2];
				while( v[2] <= v1[2] ){
					nibs.push( [ Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2]) ] );
					v[2] += vs[2];
				}
				v[1] += vs[1];
			}
			v[0] += vs[0];
		}
		return nibs;
	}
	
	public lineTo( ex, ey ){
		let startPoint = this.mapper( this.penX, this.penY );
		let endPoint = this.mapper( ex, ey );
		
		let [vx, vy, vz] = this.cloud.getVoxelDimension();
		
		let dx = endPoint[0] - startPoint[0];
		let dy = endPoint[1] - startPoint[1];
		let dz = endPoint[2] - startPoint[2];
		
		let count = Math.max( Math.abs(dx / vx), Math.abs(dy / vy), Math.abs(dz / vz) );
		let step = [ dx / count, dy / count, dz / count ];
		
		for( let n = 0; n < this.nibs.length; n++ ){
			let p = this.nibs[n];
			let px = p[0], py = p[1], pz = p[2];
			
			for( let i = 0; i <= count; i++ ){
				this.cloud.writePixelAt( 1, Math.floor(px), Math.floor(py), Math.floor(pz) );
				px+=step[0];
				py+=step[1];
				pz+=step[2];
			}
			
			this.nibs[n] = [ this.nibs[n][0] + dx, this.nibs[n][1] + dy, this.nibs[n][2] + dz ];
		}
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

		let eu = vec3.normalize( vec3.create(), section.xAxis );
		let ev = vec3.normalize( vec3.create(), section.yAxis );
		// let unit = Math.min( vs[0], vs[1], vs[2] );
		// vec3.scale( eu, eu, unit );
		// vec3.scale( eu, eu, unit );
		
		/**
		 * prepare point handle functions
		 */
		let copy = (p) => vec3.clone( p );
		let left = (p) => {
			let cx = Math.floor( p[0] ), cy = Math.floor( p[1] ), cz = Math.floor( p[2] );
			do{
				vec3.subtract( p, p, eu );
			}while( Math.floor(p[0]) === cx && Math.floor(p[1]) === cy &&  Math.floor(p[2]) === cz );
			return p;
		};
		let right = (p) => {
			let cx = Math.floor( p[0] ), cy = Math.floor( p[1] ), cz = Math.floor( p[2] );
			do{
				vec3.add( p, p, eu );
			}while( Math.floor(p[0]) === cx && Math.floor(p[1]) === cy &&  Math.floor(p[2]) === cz );
			return p;
		};
		let up = (p) => {
			let cx = Math.floor( p[0] ), cy = Math.floor( p[1] ), cz = Math.floor( p[2] );
			do{
				vec3.subtract( p, p, ev )
			}while( Math.floor(p[0]) === cx && Math.floor(p[1]) === cy &&  Math.floor(p[2]) === cz );
			return p;
		};
		let down = (p) => {
			let cx = Math.floor( p[0] ), cy = Math.floor( p[1] ), cz = Math.floor( p[2] );
			do{
				vec3.add( p, p, ev );
			}while( Math.floor(p[0]) === cx && Math.floor(p[1]) === cy &&  Math.floor(p[2]) === cz );
			return p;
		};
		let isBroken = (p) => {
			return p[0] < 0 || p[1] < 0 || p[2] < 0 || dim[0] <= p[0] || dim[1] <= p[1] || dim[2] <= p[2];
		};
		let isEdge = (p) => {
			return !!this.cloud.getPixelWithInterpolation( Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]) );
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
				
				while( lineBufferOffset > 0 ){
					let pz = lineBuffer[ --lineBufferOffset ];
					let py = lineBuffer[ --lineBufferOffset ];
					let px = lineBuffer[ --lineBufferOffset ];
					this.cloud.writePixelAt( 1, Math.floor(px), Math.floor(py), Math.floor(pz) );
				}
			}
		};

		let failSafe = 1024 * 1024 * 10;
		
		/**
		 * scan line 
		 */
		let scanLine = (pos) => {

			if( isEdge(pos) ) return true;
				
			let p = copy(pos);
			let brokenPath = false;
			
			// lineBufferを座標集合で利用するために一旦最も左に向い、その後右に走るため、動作は遅くなる。
			MOVE_LEFT: while( true ){
				if( --failSafe < 0 ) throw 'Limit over on MOVE_LEFT';
				
				left(p);
				switch( true ){
					case isBroken(p): brokenPath = true; break MOVE_LEFT;
					case isEdge(p): break MOVE_LEFT;
					default: 
				}
			}
			if( brokenPath ) return false;
			
			CORRECT_POINT_MOVING_RIGHT: while( true ){
				if( --failSafe < 0 ) throw 'Limit over on CORRECT_POINT_MOVING_RIGHT';

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
			if( failSafe-- < 0 ) throw 'Limit over on scanLine loop';
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

