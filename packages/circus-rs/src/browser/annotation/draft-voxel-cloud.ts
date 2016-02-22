'use strict';

import { VolumeViewState } from '../volume-view-state';
import { Sprite } from '../sprite';
import { Annotation } from './annotation';
import { VoxelCloudSprite } from './draft-voxel-cloud-sprite';

type Point3 = number[];
type RGBA = [number, number, number, number];

export class VoxelCloudAnnotation extends Annotation {
	private voxelArray: Point3[];
	private voxelCube: number[][][];
	private color: RGBA;
	constructor(voxelSize: number[], paintData: number[][], color: RGBA) {
		super();
		//set data
		this.color = color;
		this.voxelArray = [];
		for (var i = 0; i < paintData.length; ++i) {
			this.voxelArray.push(paintData[i]);
		}
		//NEW implementation--------------------
		//init cube
		this.voxelCube = new Array(voxelSize[0]);
		for (var i = 0; i < this.voxelCube.length; ++i) {
			this.voxelCube[i] = new Array(voxelSize[1]);
			for (var j = 0; j < voxelSize[1]; ++j) {
				this.voxelCube[i][j] = new Array(voxelSize[2]);
			}
		}
		//map voxel data to voxelCube
		for (var i = 0; i < paintData.length; ++i) {
			let p = paintData[i];
			this.voxelCube[p[0]][p[1]][p[2]] = 1;
		}
	}
	// public getColor(): RGBA{
	// 	return this.color;
	// }
	public draw(canvasDomElement:HTMLCanvasElement, viewState:VolumeViewState): Sprite{
		let ctx = canvasDomElement.getContext('2d');
		let canvasSize = viewState.getSize();
		let colorString = this.color.join(",");
		ctx.fillStyle = "rgba(" + colorString + ")";
		for (var i = 0; i < this.voxelArray.length; ++i) {
			let coordinate = viewState.coordinateVoxelToPixel(
				this.voxelArray[i][0],
				this.voxelArray[i][1],
				this.voxelArray[i][2]);

			if( Math.abs( coordinate[2] ) < 5 ){
				ctx.fillRect( Math.round(coordinate[0]), Math.round(coordinate[1]), 1, 1 );
			}
		}
		return new VoxelCloudSprite(this);
	}
	public addVoxel(voxel: number[]): void{
		//round to integer
		voxel[0] = Math.round(voxel[0]);
		voxel[1] = Math.round(voxel[1]);
		voxel[2] = Math.round(voxel[2]);
		//duplicate check
		for (var i = 0; i < this.voxelArray.length; ++i) {
			let data = this.voxelArray[i];
			if(data[0] === voxel[0] && data[1] === voxel[1] && data[2] === voxel[2] ) {
				return;//if data is already in voxelArray, then return here.
			}
		}
		//new implementation SIMPLE!============
		// if(this.voxelCube[voxel[0]][voxel[1]][voxel[2]] === 1) {
		// 	return;
		// }
		//new implementation============
		this.voxelArray.push([voxel[0], voxel[1], voxel[2]]);
	}
	public isPaintedVoxel(voxel: number[]){
		//old implementation
		voxel = [
			Math.round(voxel[0]),
			Math.round(voxel[1]),
			Math.round(voxel[2])
		];
		let isPainted: boolean = false;
		for (var i = 0; i < this.voxelArray.length; ++i) {
			let v: number[] = this.voxelArray[i];
			if(v[0] === voxel[0] && v[1] === voxel[1] && v[2] === voxel[2]) {
				isPainted = true;
				break;
			}
		}
		//new implementation============
		// if(this.voxelCube[voxel[0]][voxel[1]][voxel[2]] === 1) {
		// 	return true;
		// } else {
		// 	return false;
		// }
		//new implementation============
		return isPainted;
	}
}
