'use strict';

import { VolumeViewState } from '../volume-view-state';
import { Sprite } from '../sprite';
import { Annotation } from './annotation';
import { VoxelCloudSprite } from './draft-voxel-cloud-sprite';
import {VoxelCloudVolume} from "../../common/VoxelCloudVolume";

type Point3 = number[];
type RGBA = [number, number, number, number];

export class VoxelCloudAnnotation extends Annotation {
	public vcv: VoxelCloudVolume;
	public drawingCoordinates = [];
	constructor(paintData: number[][], color: RGBA, size: [number, number, number]) {
		super();
		//set data
		this.vcv = new VoxelCloudVolume(paintData, color, size);
	}
	public getColor(): RGBA{
		return this.vcv.color;
	}
	public getVertexes(){
		let volumeSize = this.vcv.getDimension();
		return [
			[ this.vcv.offset[0], this.vcv.offset[1], this.vcv.offset[2] ],
			[ this.vcv.offset[0] + volumeSize[0], this.vcv.offset[1], this.vcv.offset[2] ],
			[ this.vcv.offset[0], this.vcv.offset[1] + volumeSize[1], this.vcv.offset[2] ],
			[ this.vcv.offset[0], this.vcv.offset[1], this.vcv.offset[2] + volumeSize[2] ],
			[ this.vcv.offset[0] + volumeSize[0], this.vcv.offset[1] + volumeSize[1], this.vcv.offset[2] ],
			[ this.vcv.offset[0], this.vcv.offset[1] + volumeSize[1], this.vcv.offset[2] + volumeSize[2] ],
			[ this.vcv.offset[0] + volumeSize[0], this.vcv.offset[1] + volumeSize[1], this.vcv.offset[2] + volumeSize[2] ]
		];
	}
	public getVertexes2(){
		return [
			[this.vcv.min[0], this.vcv.min[1], this.vcv.min[2]],
			[this.vcv.max[0], this.vcv.min[1], this.vcv.min[2]],
			[this.vcv.min[0], this.vcv.max[1], this.vcv.min[2]],
			[this.vcv.min[0], this.vcv.min[1], this.vcv.max[2]],
			[this.vcv.max[0], this.vcv.max[1], this.vcv.min[2]],
			[this.vcv.max[0], this.vcv.min[1], this.vcv.max[2]],
			[this.vcv.min[0], this.vcv.max[1], this.vcv.max[2]],
			[this.vcv.max[0], this.vcv.max[1], this.vcv.max[2]]
		];
	}
	public draw_old(canvasDomElement:HTMLCanvasElement, viewState:VolumeViewState): Sprite{

		let vertexes = this.getVertexes();
		let plus = false, minus = false;
		for( var i = 0; i < vertexes.length; i++ ){
			let coordOnCanvas = viewState.coordinateVoxelToPixel( vertexes[i][0], vertexes[i][1], vertexes[i][2] );
			plus = plus || coordOnCanvas[2] >= 0;
			minus = minus || coordOnCanvas[2] <= 0;
			if(plus && minus) break;
		}
		if( !plus || !minus ) return null;

		let [canvasWidth, canvasHeight] = viewState.getSize();
		let ctx = canvasDomElement.getContext('2d');

		let colorString = this.vcv.color.join(",");
		ctx.fillStyle = "rgba(" + colorString + ")";

		let [ volumeWidth, volumeHeight, volumeDepth ] = this.vcv.getDimension();
		let diagonal = Math.sqrt(volumeWidth*volumeWidth + volumeHeight*volumeHeight + volumeDepth*volumeDepth);
		let imageBuffer = new Uint8Array( volumeWidth * volumeHeight );
		// let imageBuffer = new Uint8Array( diagonal * diagonal );


		let orig = viewState.getOrigin();
		// let offsetOnCanvas = viewState.coordinateVoxelToPixel(this.vcv.offset[0], this.vcv.offset[1], this.vcv.offset[2]);
		this.vcv.scanCrossSection(
			[orig[0] - this.vcv.offset[0], orig[1] - this.vcv.offset[1], orig[2] - this.vcv.offset[2]],
			// [orig[0], orig[1], orig[2]],
			// [0, 0, 0],
			[viewState.getUnitX()[0], viewState.getUnitX()[1], viewState.getUnitX()[2]],
			[viewState.getUnitY()[0], viewState.getUnitY()[1], viewState.getUnitY()[2]],
			[ volumeWidth, volumeHeight ],
			imageBuffer
			// [diagonal, diagonal]
		);

		var imageData = ctx.createImageData( volumeWidth, volumeHeight );
		let pixel;
		for (var y = 0; y < volumeHeight; y++) {//volumeHeight
			for (var x = 0; x < volumeWidth; x++) {//volumeWidth
				var srcidx = (volumeWidth * y + x);
				pixel = imageBuffer[srcidx];
				var dstidx = srcidx << 2; // meaning mul 4
				if(pixel !== 0) {
					// console.log("ok");
					// console.log(pixel);
					// imageData.data[dstidx] = this.vcv.color[0];
					// imageData.data[dstidx + 1] = this.vcv.color[1];
					// imageData.data[dstidx + 2] = this.vcv.color[2];
					// // imageData.data[dstidx + 3] = Math.round(this.vcv.color[3] * 255);
					// imageData.data[dstidx + 3] = 255;
					// ctx.fillRect( Math.round( offsetOnCanvas[0] ) + x, Math.round( offsetOnCanvas[1] ) + y, 1,1 );
					// ctx.fillRect( x + offsetOnCanvas[0], y + offsetOnCanvas[1], 1,1 );
					ctx.fillRect( x, y, 1,1 );
				}
			}
		}
		// ctx.putImageData( imageData, 0, 0 );
		// for (var i = 0; i < ar.length; ++i) {
		// 	let coordinate = viewState.coordinateVoxelToPixel(
		// 		ar[i][0],
		// 		ar[i][1],
		// 		ar[i][2]);
		// 	if( Math.abs( coordinate[2] ) < 5 ){
		// 		ctx.fillRect( Math.round(coordinate[0]), Math.round(coordinate[1]), 1, 1 );
		// 	}
		// }
		return new VoxelCloudSprite(this);
	}
	public draw_expand_realTime(canvasDomElement:HTMLCanvasElement, viewState:VolumeViewState): Sprite{

		let vertexes = this.getVertexes();
		let plus = false, minus = false;
		for( var i = 0; i < vertexes.length; i++ ){
			let coordOnCanvas = viewState.coordinateVoxelToPixel( vertexes[i][0], vertexes[i][1], vertexes[i][2] );
			plus = plus || coordOnCanvas[2] >= 0;
			minus = minus || coordOnCanvas[2] <= 0;
			if(plus && minus) break;
		}
		if( !plus || !minus ) return null;

		let [canvasWidth, canvasHeight] = viewState.getSize();
		let ctx = canvasDomElement.getContext('2d');

		let colorString = this.vcv.color.join(",");
		ctx.fillStyle = "rgba(" + colorString + ")";

		//prepare image array buffer
		let [ volumeWidth, volumeHeight, volumeDepth ] = this.vcv.expandedVolumeSize();
		let imageBuffer = new Uint8Array( volumeWidth * volumeHeight );

		let orig = viewState.getOrigin();
		this.vcv.scanProjectedVolume(
			[orig[0], orig[1], orig[2]],
			[viewState.getUnitX()[0], viewState.getUnitX()[1], viewState.getUnitX()[2]],
			[viewState.getUnitY()[0], viewState.getUnitY()[1], viewState.getUnitY()[2]],
			[ volumeWidth, volumeHeight ],
			imageBuffer
		);

		var imageData = ctx.createImageData( volumeWidth, volumeHeight );
		let pixel;
		for (var y = 0; y < volumeHeight; y++) {//volumeHeight
			for (var x = 0; x < volumeWidth; x++) {//volumeWidth
				var srcidx = (volumeWidth * y + x);
				pixel = imageBuffer[srcidx];
				var dstidx = srcidx << 2; // meaning mul 4
				if(pixel !== 0) {
					// console.log("ok");
					// console.log(pixel);
					// imageData.data[dstidx] = this.vcv.color[0];
					// imageData.data[dstidx + 1] = this.vcv.color[1];
					// imageData.data[dstidx + 2] = this.vcv.color[2];
					// // imageData.data[dstidx + 3] = Math.round(this.vcv.color[3] * 255);
					// imageData.data[dstidx + 3] = 255;
					// ctx.fillRect( Math.round( offsetOnCanvas[0] ) + x, Math.round( offsetOnCanvas[1] ) + y, 1,1 );
					// ctx.fillRect( x + offsetOnCanvas[0], y + offsetOnCanvas[1], 1,1 );
					ctx.fillRect( x, y, 1,1 );
				}
			}
		}
		// ctx.putImageData( imageData, 0, 0 );
		// for (var i = 0; i < ar.length; ++i) {
		// 	let coordinate = viewState.coordinateVoxelToPixel(
		// 		ar[i][0],
		// 		ar[i][1],
		// 		ar[i][2]);
		// 	if( Math.abs( coordinate[2] ) < 5 ){
		// 		ctx.fillRect( Math.round(coordinate[0]), Math.round(coordinate[1]), 1, 1 );
		// 	}
		// }
		return new VoxelCloudSprite(this);
	}
	public draw(canvasDomElement:HTMLCanvasElement, viewState:VolumeViewState): Sprite{

		let vertexes = this.getVertexes2();
		let plus = false, minus = false;
		for( var i = 0; i < vertexes.length; i++ ){
			let coordOnCanvas = viewState.coordinateVoxelToPixel( vertexes[i][0], vertexes[i][1], vertexes[i][2] );
			plus = plus || coordOnCanvas[2] >= 0;
			minus = minus || coordOnCanvas[2] <= 0;
			if(plus && minus){
				break;
			}
		}
		if( !plus || !minus ){
			return null;
		}

		///prepare for canvas
		let [canvasWidth, canvasHeight] = viewState.getSize();
		let ctx = canvasDomElement.getContext('2d');
		let colorString = this.vcv.color.join(",");
		ctx.fillStyle = "rgba(" + colorString + ")";

		//prepare image array buffer
		let [ volumeWidth, volumeHeight, volumeDepth ] = this.vcv.getDimension();
		let imageBuffer = new Uint8Array( volumeWidth * volumeHeight );

		let orig = viewState.getOrigin();
		this.vcv.scanCrossSection(
			[orig[0], orig[1], orig[2]],
			[viewState.getUnitX()[0], viewState.getUnitX()[1], viewState.getUnitX()[2]],
			[viewState.getUnitY()[0], viewState.getUnitY()[1], viewState.getUnitY()[2]],
			[ volumeWidth, volumeHeight ],
			imageBuffer
		);

		let pixel, srcidx;//reuse
		for (let y = 0; y < volumeHeight; y++) {//volumeHeight
			for (let x = 0; x < volumeWidth; x++) {//volumeWidth
				srcidx = (volumeWidth * y + x);
				pixel = imageBuffer[srcidx];
				if(pixel !== 0) {
					ctx.fillRect( x, y, 1,1 );
				}
			}
		}
		return new VoxelCloudSprite(this);
	}
	public addVoxel(voxel: number[]): void{
		//round to integer
		voxel[0] = Math.round(voxel[0]);
		voxel[1] = Math.round(voxel[1]);
		voxel[2] = Math.round(voxel[2]);
		this.vcv.writePixelAt(1, voxel[0], voxel[1], voxel[2]);
	}
	/*
	 * used from bucket tool
	 * @param voxel {number[]} voxel data
	 */
	public isPaintedVoxel(voxel: number[]): boolean{
		voxel = [
			Math.round(voxel[0]),
			Math.round(voxel[1]),
			Math.round(voxel[2])
		];
		let p = this.vcv.getPixelAt(voxel[0], voxel[1], voxel[2]);
		let isPainted: boolean = (p !== 0);
		return isPainted;
	}
	public updateMinAndMax(){
		this.vcv.updateMinAndMax(this.drawingCoordinates);
	}
}
