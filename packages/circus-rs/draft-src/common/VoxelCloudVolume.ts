"use strict";
import RawData from './RawData';
import {PixelFormat} from "./PixelFormat";

type RGBA = [number, number, number, number];
type Vector3D = [number, number, number];
type Vector2D = [number, number];

export class VoxelCloudVolume extends RawData {
	public offset: [number, number, number];
	public color: RGBA;
	public mainDataSize: [number, number, number];
	public min: [number, number, number] = [0, 0, 0];
	public max: [number, number, number] = [0, 0, 0];
	constructor(paintData: number[][], color: RGBA, size: [number, number, number]) {
		super();
		this.color = color;
		// this.houseDataToMinimumVoxel(paintData);
		this.mainDataSize = size;
		//---------------------------
		//prepare volume to house data to the binary volume
		this.setDimension(size[0], size[1], size[2], PixelFormat.Binary);
		//house data
		//detect min, max value simultaneously
		let minX = size[0], minY = size[1], minZ = size[2];
		let maxX = 0, maxY = 0, maxZ = 0;
		for (let i = 0; i < paintData.length; ++i) {
			let val = paintData[i];
			this.writePixelAt(1, val[0], val[1], val[2]);
			minX = Math.min(minX, val[0]);
			minY = Math.min(minY, val[1]);
			minZ = Math.min(minZ, val[2]);
			maxX = Math.max(maxX, val[0]);
			maxY = Math.max(maxY, val[1]);
			maxZ = Math.max(maxZ, val[2]);
		}
		if(paintData.length > 0) {
			this.min[0] = minX;
			this.min[1] = minY;
			this.min[2] = minZ;
			this.max[0] = maxX;
			this.max[1] = maxY;
			this.max[2] = maxZ;
		} else {//init as full size
			this.min[0] = 0;
			this.min[1] = 0;
			this.min[2] = 0;
			this.max[0] = size[0];
			this.max[1] = size[1];
			this.max[2] = size[2];
		}
	}
	public expandedVolumeSize(){
		return this.getDimension();
	}
	public scanProjectedVolume(
		origin: Vector3D,
		eu: Vector3D,
		ev: Vector3D,
		outSize: Vector2D,
		image: {[index: number]: number}
	){
		let raw = this.createProjectedFullSizeVolume();
		raw.scanCrossSection(origin, eu, ev, outSize, image);
	}
	// public expandedVolumeSize(): [number, number, number]{
	// 	return this.mainDataSize;
	// }
	private houseDataToMinimumVoxel(paintData: number[][]){
		let x: number[] = [], y: number[] = [], z: number[] = [];

		if(paintData.length === 0) {
			console.log("paintData is empty");
			return;
		}
		let minX = 9999;
		let minY = 9999;
		let minZ = 9999;
		let maxX = -9999;
		let maxY = -9999;
		let maxZ = -9999;

		//separate xyz to individual array
		for (let i = 0; i < paintData.length; ++i) {
			let p = paintData[i];
			minX = Math.min( minX, p[0] );
			minY = Math.min( minY, p[1] );
			minZ = Math.min( minZ, p[2] );
			maxX = Math.max(maxX, p[0]);
			maxY = Math.max(maxY, p[1]);
			maxZ = Math.max(maxZ, p[2]);
		}
		//determine min and max
		this.offset = [minX, minY, minZ];//min as offset
console.log(this.offset);
		let lenX = maxX - minX + 1;
		let lenY = maxY - minY + 1;
		let lenZ = maxZ - minZ + 1;
		if(lenX % 8 !== 0) {
			lenX += (8 - lenX % 8);
		}
		if(lenY % 8 !== 0) {
			lenY += (8 - lenY % 8);
		}
		if(lenZ % 8 !== 0) {
			lenZ += (8 - lenZ % 8);
		}
		//create rawdata
		this.setDimension(lenX, lenY, lenZ, PixelFormat.Binary);
		// this.setDimension(lenX, lenY, lenZ, PixelFormat.UInt8);
		//house data
		for (let i = 0; i < paintData.length; ++i) {
			let val = paintData[i];
			this.writePixelAt(
				1,
				val[0] - this.offset[0],
				val[1] - this.offset[1],
				val[2] - this.offset[2]);
		}
	}
	private createProjectedFullSizeVolume(): RawData{
		//create temporal full-size volume
		let raw = new RawData();
		raw.setDimension(this.mainDataSize[0], this.mainDataSize[1], this.mainDataSize[2], PixelFormat.Binary);
		let [origWidth, origHeitht, origDepth] = [this.size[0], this.size[1], this.size[2]];
		origWidth += this.offset[0];//!!!!!!!!!!!!!!!!!!!!!!!
		origHeitht += this.offset[1];
		origDepth += this.offset[2];
		for (var i = this.offset[0]; i < origWidth; ++i) {
			for (var j = this.offset[1]; j < origHeitht; ++j) {
				for (var k = this.offset[2]; k < origDepth; ++k) {
					let p = this.getPixelAt(i, j, k);
					if(p === 1) {
						//raise bit in the new rawData
						raw.writePixelAt(1, i, j, k);
					}
				}
			}
		}
		return raw;
	}
	public updateMinAndMax(coordinates){
		for (var i = 0; i < coordinates.length; ++i) {
			this.min[0] = Math.min(this.min[0], coordinates[i][0]);
			this.min[1] = Math.min(this.min[1], coordinates[i][1]);
			this.min[2] = Math.min(this.min[2], coordinates[i][2]);
			this.max[0] = Math.max(this.max[0], coordinates[i][0]);
			this.max[1] = Math.max(this.max[1], coordinates[i][1]);
			this.max[2] = Math.max(this.max[2], coordinates[i][2]);
		}
	}
}