/// <reference path="../typings/gl-matrix/gl-matrix.d.ts" />
'use strict';

import * as gl from 'gl-matrix';
let mat4 = gl.mat4;
let vec3 = gl.vec3;

import { EventEmitter } from 'events';

type Point2 = number[];
type Point3 = number[];
type Vector3 = number[];
type Size2 = number[];

export class VolumeViewState extends EventEmitter {

	private viewportSize: Size2; // [px]

	// cross section definition
	public origin: Point3; // [voxel index]
	public xAxis: Vector3; // [voxel index]
	public yAxis: Vector3; // [voxel index]

	// display option
	public windowLevel: number;
	public windowWidth: number;

	public zoom: number = 1.00;

	constructor(
		viewportSize: Size2,
		origin: Point3 = [0, 0, 0],
		xAxis?: Vector3,
		yAxis?: Vector3,
		windowLevel: number = 1500,
		windowWidth: number = 2000
	) {
		super();
		this.viewportSize = viewportSize.map( i=>Number(i) );
		this.origin = origin;
		this.xAxis = xAxis || [ viewportSize[0], 0, 0 ];
		this.yAxis = yAxis || [ 0, viewportSize[1], 0 ];
		this.windowLevel = windowLevel;
		this.windowWidth = windowWidth;
	}
	
	public getOrigin() { return this.origin; }
	public getZoom() { return this.zoom; }
	public getWindowLevel() { return this.windowLevel; }
	public getWindowWidth() { return this.windowWidth; }
	public getSize(): Point2 { return this.viewportSize; }
	public getVectorX(): Vector3 { return this.xAxis; }
	public getVectorY(): Vector3 { return this.yAxis; }

	public getUnitX(): Vector3 {
		return vec3.scale( vec3.create(), this.xAxis, 1.00 / this.viewportSize[0] );
	}

	public getUnitY(): Vector3 {
		return vec3.scale( vec3.create(), this.yAxis, 1.00 / this.viewportSize[1] );
	}

	public getNormalVector() {
		let nv = vec3.cross(vec3.create(), this.xAxis, this.yAxis);
		return vec3.normalize(nv, nv);
	}

	public getCenter(): Point3 {
		
		let center = vec3.clone( this.origin );
		vec3.add( center, center, vec3.scale(vec3.create(), this.xAxis, 0.5) );
		vec3.add( center, center, vec3.scale(vec3.create(), this.yAxis, 0.5) );
		
		return center;
	}

	public isAxial(): boolean {
		let nv = this.getNormalVector();
		return nv[0] === 0 && nv[1] === 0;
	}

	public isCoronal(): boolean {
		let nv = this.getNormalVector();
		return nv[1] === 0 && nv[2] === 0;
	}

	public isSagittal(): boolean {
		let nv = this.getNormalVector();
		return nv[2] === 0 && nv[0] === 0;
	}

	public coordinatePixelToVoxel(x, y): Point3 {

		let vx = vec3.scale( vec3.create(), this.xAxis, x / vec3.length( this.xAxis ) );
		let vy = vec3.scale( vec3.create(), this.yAxis, y / vec3.length( this.yAxis ) );

		let p = vec3.clone( this.origin );
		vec3.add(p, p, vx);
		vec3.add(p, p, vy);

		return p;
	}

	public coordinateVoxelToPixel( x: number, y: number, z: number ): Point3 {

		let p0 = vec3.fromValues(x, y, z);
		let p1 = vec3.subtract(vec3.create(), p0, this.origin);

		let ux = vec3.normalize( vec3.create(), this.xAxis ),
			uy = vec3.normalize( vec3.create(), this.yAxis );

		let vx = vec3.dot( p1, ux );
		let vy = vec3.dot( p1, uy );
		let vz = vec3.dot( p1, this.getNormalVector() );
		return [
			vx * this.zoom,
			vy * this.zoom,
			vz * this.zoom
		];
	}
	
	public change(){
		this.emit('change');
	}

	public transrate(x: number, y: number, z: number): void {
		let transMatrix = mat4.create();
		mat4.translate(transMatrix, mat4.create(), vec3.fromValues(x, y, z));
		vec3.transformMat4(this.origin, this.origin, transMatrix);
		
		this.change();
	}
	
	public scale(scale: number, centralPoint?: Point3): void {
		this.zoom = this.zoom / scale;

		if (typeof centralPoint === 'undefined' || centralPoint === null)
			centralPoint = this.getCenter();

		let operation = [
			t => mat4.translate( mat4.create(), t, vec3.scale( vec3.create(), centralPoint, -1) ),
			t => mat4.scale( mat4.create(), t, vec3.fromValues( scale, scale, scale ) ),
			t => mat4.translate( mat4.create(), t, centralPoint )
		].reverse().reduce( (p, t) => t(p), mat4.create() );

		let xEndPoint = vec3.add( vec3.create(), this.xAxis, this.origin );
		let yEndPoint = vec3.add( vec3.create(), this.yAxis, this.origin );

		let [ rOrigin, rXEndPoint, rYEndPoint ] = [ this.origin, xEndPoint, yEndPoint ].map(
			p => vec3.transformMat4( vec3.create(), p, operation )
		);

		this.origin = rOrigin;
		this.xAxis = vec3.subtract( vec3.create(), rXEndPoint, rOrigin );
		this.yAxis = vec3.subtract( vec3.create(), rYEndPoint, rOrigin );
		
		this.change();
	}

	/**
	 * Rotates about an arbitrary vector passing through the arbitrary point.
	 * Angle unit is degree.
	 * Todo: Use the multiplication in order to reduce the number of operations.
	 */
	public rotate(deg: number, axis: Vector3, centralPoint?: Vector3) {

		if (typeof centralPoint === 'undefined' || centralPoint === null)
			centralPoint = this.getCenter();

		let radian = Math.PI / 180.0 * deg;

		let operation = mat4.create();
		mat4.translate( operation, operation, centralPoint )
		mat4.rotate( operation, operation, radian, axis ),
		mat4.translate( operation, operation, vec3.scale( vec3.create(), centralPoint, -1) );

		let xEndPoint = vec3.add(vec3.create(), this.xAxis, this.origin);
		let yEndPoint = vec3.add(vec3.create(), this.yAxis, this.origin);

		let [ rOrigin, rXEndPoint, rYEndPoint ] = [ this.origin, xEndPoint, yEndPoint ].map(
			p => vec3.transformMat4(vec3.create(), p, operation)
		);

		this.origin = rOrigin;
		vec3.subtract(this.xAxis, rXEndPoint, rOrigin);
		vec3.subtract(this.yAxis, rYEndPoint, rOrigin);

		this.change();
	}

	/**
	 * Rotates about an axis parallel to the [X|Y|Z] axis passing through the arbitrary point.
	 * Angle unit is degree.
	 */
	public rotateX(deg: number, centralPoint?: Vector3): void {
		this.rotate(deg, [1, 0, 0], centralPoint);
	}

	public rotateY(deg: number, centralPoint?: Vector3): void {
		this.rotate(deg, [0, 1, 0], centralPoint);
	}

	public rotateZ(deg: number, centralPoint?: Vector3): void {
		this.rotate(deg, [0, 0, 1], centralPoint);
	}
}
