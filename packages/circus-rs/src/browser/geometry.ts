import { vec3 } from 'gl-matrix';
import RawData from '../common/RawData';
import { PixelFormat, PixelFormatInfo, pixelFormatInfo } from '../common/PixelFormat';
import { Section } from './section';

interface LineSegment {
	// origin: [number,number,number],// [mm]
	// vector: [number,number,number] // [mm]
	origin: number[],// [mm]
	vector: number[] // [mm]
}

export function coordinate2D(
		section: Section,
		resolution: [number,number],
		p3: [number,number,number]
	): [number,number] {
		const p = vec3.subtract( vec3.create(), p3, section.origin );
		
		const p2 = [
			vec3.dot( vec3.normalize( vec3.create(), section.xAxis ), p ) * resolution[0] / vec3.length( section.xAxis ),
			vec3.dot( vec3.normalize( vec3.create(), section.yAxis ), p ) * resolution[1] / vec3.length( section.yAxis )
		]
		
		return [p2[0],p2[1]];
}

export function coordinate3D(
	section: Section,
	resolution: [number,number],
	p2: [number,number],
): [number,number,number] {
	
		let p3 = vec3.clone( section.origin );
		
		const xComponent = [
			p2[0] * ( section.xAxis[0] / resolution[0] ),
			p2[0] * ( section.xAxis[1] / resolution[0] ),
			p2[0] * ( section.xAxis[2] / resolution[0] )
		];
		const yComponent = [
			p2[1] * ( section.yAxis[0] / resolution[1] ),
			p2[1] * ( section.yAxis[1] / resolution[1] ),
			p2[1] * ( section.yAxis[2] / resolution[1] )
		];
		
		vec3.add( p3, p3, xComponent );
		vec3.add( p3, p3, yComponent );
		
		return [ p3[0], p3[1], p3[2] ];
}


/**
 * 線分と平面の交点を取得する
 */
export function getIntersection( section: Section, line: LineSegment ): [ number,number,number] {

	const nv = normalVector( section );
	const P = section.origin;
	const endA = line.origin;
	const endB = vec3.add( vec3.create(), line.origin, line.vector );
	
	// // for debug ----------------------------------- 
	// let vertexes = [];
	// vertexes.push( vec3.clone( section.origin ) );
	// vertexes.push( vec3.add(vec3.create(), section.origin, section.xAxis) );
	// vertexes.push( vec3.add(vec3.create(), section.origin, vec3.add(vec3.create(), section.yAxis, section.xAxis)) );
	// vertexes.push( vec3.add(vec3.create(), section.origin, section.yAxis) );
	// console.log( 'Section: ' +
		// vec3.str(vertexes[0]).substr(4) + ' - ' + 
		// vec3.str(vertexes[1]).substr(4) + ' - ' + 
		// vec3.str(vertexes[2]).substr(4) + ' - ' + 
		// vec3.str(vertexes[3]).substr(4) );
	// console.log( 'Line: ' + vec3.str(endA).substr(4) + ' - ' + vec3.str(endB).substr(4) );
	// // ----------------------------------- for debug
	
	const vecPA = vec3.subtract( vec3.create(), P, endA );
	const vecPB = vec3.subtract( vec3.create(), P, endB );
	
	const dotNvA = vec3.dot( vecPA, nv );
	const dotNvB = vec3.dot( vecPB, nv );
	
	if( dotNvA === 0 && dotNvB === 0 ){ // both ends on the section
		return null;
	}else if( 0 < dotNvA && 0 < dotNvB ){ // both ends upper the section
		return null;
	}else if( dotNvA < 0 && dotNvB < 0 ){ // both ends under the section
		return null;
	}else{
		const rate = Math.abs( dotNvA ) / ( Math.abs( dotNvA ) + Math.abs( dotNvB ) );
		const vecAX = vec3.scale( vec3.create(), line.vector, rate );
		const intersection = vec3.add( vec3.create(), endA, vecAX );
		
		return intersection as [number,number,number];
	}
}

/**
 * Normal vector
 */
export function normalVector( section: Section ) {
	let nv = vec3.create();
	vec3.cross(nv, section.xAxis, section.yAxis);
	vec3.normalize(nv, nv);
	return nv;
}





/**
 * Voxel空間上の2点間を通過するすべてのvoxelを塗りつぶす(たとえかすめるだけだとしても)
 * TODO: translate comment
 * TODO: 方向別のエッジ超え判定を導入し、無駄な writePixelAt の呼び出しを低減させる
 */
export function mmLine3(
	volume: RawData,
	p0: [number, number, number], // offset (not mm!)
	p1: [number, number, number], // offset (not mm!)
	value: number = 1
) {
	if (volume.getPixelFormat() !== PixelFormat.Binary) {
		throw new Error('TRANSLATE: 現バージョンでは、BINARYフォーマットにのみ対応...本当かな?');
	}
	
	let vs = volume.getVoxelDimension();

	const e = vec3.normalize(vec3.create(), [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
	const distance = vec3.length([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
	let walked = 0.0;
	
	let pi = p0.concat();

	const trim_x = e[0] < 0
		? (i) => i === Math.floor(i) ? i - 1 : Math.floor(i)
		: (i) => Math.floor(i);
	const trim_y = e[1] < 0
		? (i) => i === Math.floor(i) ? i - 1 : Math.floor(i)
		: (i) => Math.floor(i);
	const trim_z = e[2] < 0
		? (i) => i === Math.floor(i) ? i - 1 : Math.floor(i)
		: (i) => Math.floor(i);

	do {
		volume.writePixelAt(value, trim_x(pi[0]), trim_y(pi[1]), trim_z(pi[2]));

		let step = getStepToNeighbor(pi, e);
		// console.log('pi: '+vec3.str(pi));
		vec3.add(pi, pi, step);
		walked += vec3.length(step);

	} while (walked < distance);

	volume.writePixelAt(value, Math.floor(p1[0]), Math.floor(p1[1]), Math.floor(p1[2])); // 誤差吸収
}

/**
 * 隣接するボクセルを取得
 *   e方向に最も近い次へ進むためのベクトルを返す
 * @param pos
 * @param e toward unit vector
 * @param vs voxel-size
 * @return p {number} neighbor pos.
 * TODO: translate comment
 */
export function getStepToNeighbor(pos, e) {
	let stepLengthEntry = [
		nextLatticeDistance(pos[0], e[0]),
		nextLatticeDistance(pos[1], e[1]),
		nextLatticeDistance(pos[2], e[2])
	];
	stepLengthEntry = stepLengthEntry.filter((i) => i !== null);

	const stepLength = stepLengthEntry.reduce((prev, cur) => {
		return cur === null ? prev : ( prev < cur ? prev : cur );
	}, Number.POSITIVE_INFINITY);

	// console.log( stepLength.toString() + ' / ' + vec3.str( stepLengthEntry) );

	return [
		e[0] * stepLength,
		e[1] * stepLength,
		e[2] * stepLength
	];
}
	
/**
 * 次の格子点までの距離を取得
 * 対象1次元
 * @param p 現在地点
 * @param u 格子の方向兼幅
 */
export function nextLatticeDistance(p, u) {
	if (u === 0) return null;
	let i = u < 0 ? Math.floor(p) : Math.ceil(p);
	if (p === i) return Math.abs(1 / u);

	return Math.abs(( p - i ) / u);
}
