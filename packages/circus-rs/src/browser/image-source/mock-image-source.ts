'use strict';

import DicomVolume from '../../common/DicomVolume';
import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';
import { DicomMetadata } from '../../browser/interface/dicom-metadata';
import { ImageSource } from '../../browser/image-source/image-source';


export class MockImageSource extends ImageSource {

	private meta: DicomMetadata;
	private volume: DicomVolume;

	constructor(meta: DicomMetadata) {
		super();
		this.meta = meta;
		this.meta.estimatedWindow = { level: 10, width: 100 };
		this.meta.dicomWindow = { level: 10, width: 100 };
		this.meta.voxelSize = meta.voxelSize || [0.5, 0.5, 0.5];
		this.meta.voxelCount = meta.voxelCount || [512, 512, 478];

		this.volume = this.createMockVolume(meta);
	}

	private createMockVolume(meta: DicomMetadata): DicomVolume {

		let [ width, height, depth ] = meta.voxelCount;
		let [ vx, vy, vz ] = meta.voxelSize;
		let pixelFormat = PixelFormat.Int16;
		let [ wl, ww ] = [meta.estimatedWindow.level, meta.estimatedWindow.width];

		let raw = new DicomVolume();
		raw.setDimension(width, height, depth, pixelFormat);

		let createValue = (x, y, z) => {
			let val: number;

			if (pixelFormat === PixelFormat.Binary) {
				val = ( Math.floor(x * 0.02)
					+ Math.floor(y * 0.02)
					+ Math.floor(z * 0.02) ) % 2;
			} else {
				val = ( Math.floor(x * 0.02)
					+ Math.floor(y * 0.02)
					+ Math.floor(z * 0.02) ) % 3 * 30;
			}

			return val;
		};

		for (var z = 0; z < depth; z++) {
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					raw.writePixelAt(createValue(x, y, z), x, y, z);
				}
			}
			raw.markSliceAsLoaded(z);
		}
		raw.setVoxelDimension(vx, vy, vz);
		raw.setEstimatedWindow(wl, ww);
		return raw;
	}

	public state() {
		let state = {
			estimateWindow: {
				level: this.meta.estimatedWindow.level,
				width: this.meta.estimatedWindow.width
			},
			dicomWindow: {
				level: this.meta.dicomWindow.level,
				width: this.meta.dicomWindow.width
			},
			voxelSize: [this.meta.voxelSize[0], this.meta.voxelSize[1], this.meta.voxelSize[2]],
			voxelCount: [this.meta.voxelCount[0], this.meta.voxelCount[1], this.meta.voxelCount[2]]
		};
		return state;
	}

	public draw(canvasDomElement, viewState): Promise<any> {

		let context = canvasDomElement.getContext('2d');
		let vpWidth = Number(canvasDomElement.getAttribute('width'));
		let vpHeight = Number(canvasDomElement.getAttribute('height'));
		let section = viewState.section;

		return this.ready().then(() => {

			let rawSection = this.volume.mmGetSection(
				section.origin,
				section.xAxis,
				section.yAxis,
				[vpWidth, vpHeight]
			);

			let imageData = context.createImageData(vpWidth, vpHeight);

			let srcidx = 0, pixel, dstidx;
			for (let y = 0; y < vpHeight; y++) {
				for (let x = 0; x < vpWidth; x++) {
					pixel = rawSection.read(srcidx);
					dstidx = srcidx << 2; // meaning multiply 4
					imageData.data[dstidx] = pixel;
					imageData.data[dstidx + 1] = pixel;
					imageData.data[dstidx + 2] = pixel;
					imageData.data[dstidx + 3] = 0xff;
					srcidx++;
				}
			}
			context.putImageData(imageData, 0, 0);
		});
	}

}
