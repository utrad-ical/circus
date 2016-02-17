'use strict';

import { Sprite } from '../sprite';
import { Annotation } from '../annotation';
import { ViewState } from '../view-state';
import { VoxelCloudSprite } from './voxel-cloud-sprite';

type Point3 = [ number, number, number ];

export class VoxelCloudAnnotation extends Annotation {
	private voxelArray: Point3[];
	private voxelCube: number[][][];
	private color: Point3;
	constructor(voxelSize: [number, number, number], paintData: [number, number, number][], color: [number, number, number]) {
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
	public draw(canvasDomElement:HTMLCanvasElement, viewState:ViewState): Sprite{
		let ctx = canvasDomElement.getContext('2d');
		let canvasSize = viewState.getSize();
		ctx.fillStyle='rgba(0,255,0,1.0)';
		for (var i = 0; i < this.voxelArray.length; ++i) {
			let coordinate = viewState.coordinateVoxelToPixel(
				this.voxelArray[i][0],
				this.voxelArray[i][1],
				this.voxelArray[i][2]);

			if( Math.abs( coordinate[2] ) < 5 ){
				ctx.fillRect( coordinate[0], coordinate[1], 1, 1 );
			}
		}
		return new VoxelCloudSprite(this);
	}
	public addVoxel(voxel: [number, number, number]): void{
		//duplicate check
		for (var i = 0; i < this.voxelArray.length; ++i) {
			let data = this.voxelArray[i];
			if(data[0] === voxel[0] && data[1] === voxel[1] && data[2] === voxel[2] ) {
				return;//if data is already in voxelArray, then return here.
			}
		}
		this.voxelArray.push([voxel[0], voxel[1], voxel[2]]);
	}
}