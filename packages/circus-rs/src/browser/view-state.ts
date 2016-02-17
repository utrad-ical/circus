/// <reference path="../typings/gl-matrix/gl-matrix.d.ts" />
'use strict';

var {mat4, vec3} = require('gl-matrix');

type Point2 = [ number,number ];
type Point3 = [ number,number,number ];
type Vector3 = [ number,number,number ];
type Size2 = [number,number];

export class ViewState {

	private windowLevel: number;
	private windowWidth: number;

	private viewportSize: Size2; // [px]
	private zoom: number = 1.00;

	private cOrigin: Point3; // [voxel index]
	private cX: Vector3; // [voxel index]
	private cY: Vector3; // [voxel index]

	constructor(
		viewportSize: Size2,
		cOrigin: Point3 = [0,0,0],
		cX?: Vector3,
		cY?: Vector3,
		windowLevel: number = 1500,
		windowWidth: number = 2000
	){
		this.viewportSize = viewportSize;
		this.cOrigin = cOrigin;
		this.cX = cX || [ viewportSize[0], 0, 0 ];
		this.cY = cY || [ 0, viewportSize[1], 0 ];
		this.windowLevel = windowLevel;
		this.windowWidth = windowWidth;
	}

	public coordinatePixelToVoxel( x, y ): Point3 {

		let vx = vec3.scale( vec3.create(), this.cX, x / this.viewportSize[0] ),
			vy = vec3.scale( vec3.create(), this.cY, y / this.viewportSize[1] );

		let v1 = vec3.create(), vPos = vec3.create();
		vec3.add( v1, this.cOrigin, vx );
		vec3.add( vPos, v1, vy );

		return vPos;
	}

	/**
	 * vz だけ ...
	 */
	public coordinateVoxelToPixel( x: number, y: number, z: number, depthRate: number = 1.00 ): Point3 {

		let p0 = vec3.fromValues(x, y, z);
		let p1 = vec3.create();
		vec3.subtract(p1, p0, this.cOrigin);

		let ux = vec3.normalize( vec3.create(), this.cX ),
			uy = vec3.normalize( vec3.create(), this.cY );

		let vx = vec3.dot( p1, ux );
		let vy = vec3.dot( p1, uy );
		let vz = vec3.dot( p1, this.getNormalVector() );

		return [
			vx * this.viewportSize[0] / vec3.length( this.cX ),
			vy * this.viewportSize[1] / vec3.length( this.cY ),
			vz * depthRate
		];
	}

	public getZoom(){
		return this.zoom;
	}

	public getWindowLevel() {
		return this.windowLevel;
	}
	public getWindowWidth() {
		return this.windowWidth;
	}
	public getSize(): Point2 {
		return this.viewportSize;
	}
	public getVoxelSize(): Size2 {
		return [
			vec3.length( this.cX ),
			vec3.length( this.cY )
		];
	}
	public getOrigin(): Point3 {
		return this.cOrigin;
	}
	public getVectorX(): Vector3 {
		return this.cX;
	}
	public getUnitX(): Vector3 {
		return vec3.scale( vec3.create(), this.cX, 1.00 / this.viewportSize[0] );
	}
	public getVectorY(): Vector3 {
		return this.cY;
	}
	public getUnitY(): Vector3 {
		return vec3.scale( vec3.create(), this.cY, 1.00 / this.viewportSize[1] );
	}
	public getLeftTop(): Point3 {
		return this.cOrigin;
	}
	public getLeftBottom(): Point3 {
		var corner = vec3.create();
		vec3.add( corner, this.cOrigin, this.cY );
		return corner;
	}
	public getRightTop(): Point3 {
		var corner = vec3.create();
		vec3.add( corner, this.cOrigin, this.cX );
		return corner;
	}
	public getRightBottom(): Point3 {
		var corner = vec3.create();
		vec3.add( corner, this.getRightTop(), this.cY );
		return corner;
	}
	public getNormalVector( n: number = 1000 ){

		var v01 = this.cX;
		var v02 = this.cY;

		var nv0 = vec3.create();
		var nv = vec3.create();
		vec3.cross(nv0, v01, v02);
		vec3.normalize(nv,nv0);

		return nv.map( i => Math.round( i * n ) / n );
	}

	public getCenter(): Point3 {
		var vx = vec3.create(),
			vy = vec3.create();
		vec3.scale( vx, this.cX, 0.5 );
		vec3.scale( vy, this.cY, 0.5 );

		var cx = vec3.create(),
			cxy = vec3.create();
		vec3.add( cx, this.cOrigin, vx );
		vec3.add( cxy, cx, vy );

		return [
			Math.round( cxy[0] * 1000 ) / 1000,
			Math.round( cxy[1] * 1000 ) / 1000,
			Math.round( cxy[2] * 1000 ) / 1000
		];
	}
	public getBounds(): [ Point3,Point3,Point3,Point3 ] {
		return [ this.getLeftTop(),this.getRightTop(),this.getRightBottom(),this.getLeftBottom() ];
	}

	public isAxial(): boolean {
		var nv = this.getNormalVector();
		return nv[0] === 0 && nv[1] === 0;
	}
	public isCoronal(): boolean {
		var nv = this.getNormalVector();
		return nv[1] === 0 && nv[2] === 0;
	}
	public isSagittal(): boolean {
		var nv = this.getNormalVector();
		return nv[2] === 0 && nv[0] === 0;
	}
	public isAxialOblique(): boolean {
		var nv = this.getNormalVector();
		return nv[0] === 0 && nv[1] !== 0 && nv[2] !== 0;
	}
	public isCoronalOblique(): boolean {
		var nv = this.getNormalVector();
		return nv[1] === 0 && nv[2] !== 0 && nv[0] !== 0;
	}
	public isSagittalOblique(): boolean {
		var nv = this.getNormalVector();
		return nv[2] === 0 && nv[0] !== 0 && nv[1] !== 0;
	}

	public transrate( x: number, y: number, z: number ): void {
		var transMatrix = mat4.create();
		mat4.translate(transMatrix, mat4.create(), vec3.fromValues(x, y, z));
		this.cOrigin = vec3.transformMat4(vec3.create(), this.cOrigin, transMatrix);
	}

	public scale( scale: number, centralPoint?: Point3 ): void {
		this.zoom = this.zoom / scale;

		if( typeof centralPoint === 'undefined' || centralPoint === null )
			centralPoint = this.getCenter();

		var operation = [
			t => mat4.translate( mat4.create(), t, vec3.scale( vec3.create(), centralPoint, -1) ),
			t => mat4.scale( mat4.create(), t, vec3.fromValues( scale, scale, scale ) ),
			t => mat4.translate( mat4.create(), t, centralPoint )
		].reverse().reduce( (p,t) => t(p), mat4.create() );

		let origin = this.getOrigin();
		let xEndPoint = vec3.add( vec3.create(), this.getVectorX(), this.getOrigin() );
		let yEndPoint = vec3.add( vec3.create(), this.getVectorY(), this.getOrigin() );

		let [ rOrigin, rXEndPoint, rYEndPoint ] = [ origin, xEndPoint, yEndPoint ].map(
			p => vec3.transformMat4( vec3.create(), p, operation )
		);

		this.cOrigin = rOrigin;
		this.cX = vec3.subtract( vec3.create(), rXEndPoint, rOrigin );
		this.cY = vec3.subtract( vec3.create(), rYEndPoint, rOrigin );
	}



	/**
	 * Rotates about an arbitrary vector passing through the arbitrary point.
	 * Angle unit is degree.
	 * Todo: Use the multiplication in order to reduce the number of operations.
	 */
	public rotate( deg: number, axis: Vector3, centralPoint?: Vector3 ){

		let radian = Math.PI / 180.0 * deg;
		if( typeof centralPoint === 'undefined' || centralPoint === null )
			centralPoint = this.getCenter();

		var operation = [
			t => mat4.translate( mat4.create(), t, vec3.scale( vec3.create(), centralPoint, -1) ),
			t => mat4.rotate( mat4.create(), t, radian, axis ),
			t => mat4.translate( mat4.create(), t, centralPoint )
		].reverse().reduce( (p,t) => t(p), mat4.create() );

		let origin = this.getOrigin();
		let xEndPoint = vec3.add( vec3.create(), this.getVectorX(), this.getOrigin() );
		let yEndPoint = vec3.add( vec3.create(), this.getVectorY(), this.getOrigin() );

		let [ rOrigin, rXEndPoint, rYEndPoint ] = [ origin, xEndPoint, yEndPoint ].map(
			p => vec3.transformMat4( vec3.create(), p, operation )
		);

		this.cOrigin = rOrigin;
		this.cX = vec3.subtract( vec3.create(), rXEndPoint, rOrigin );
		this.cY = vec3.subtract( vec3.create(), rYEndPoint, rOrigin );
	}

	/**
	 * Rotates about an axis parallel to the [X|Y|Z] axis passing through the arbitrary point.
	 * Angle unit is degree.
	 */
	public rotateX( deg: number, centralPoint?: Vector3 ): void {
		this.rotate( deg, [1,0,0], centralPoint );
	}
	public rotateY( deg: number, centralPoint?: Vector3 ): void {
		this.rotate( deg, [0,1,0], centralPoint );
	}
	public rotateZ( deg: number, centralPoint?: Vector3 ): void {
		this.rotate( deg, [0,0,1], centralPoint );
	}
}
