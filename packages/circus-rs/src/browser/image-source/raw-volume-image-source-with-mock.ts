'use strict';

import { Promise }    from 'es6-promise';

import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';
import DicomVolume from '../../common/DicomVolume';
import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';
import { DicomMetadata } from '../../browser/interface/dicom-metadata';
import { ImageSource } from '../../browser/image-source/image-source';
import { RsHttpLoader } from '../../browser/image-source/rs-http-loader';

export class RawVolumeImageSourceWithMock extends RsHttpLoaderImageSource {

	private volume: DicomVolume;

	protected scan(param) {
		return Promise.resolve(new Uint8Array(1)); // Dummy?
	}

	protected onMetaLoaded() {
		const meta = this.meta;
		const est = meta.estimatedWindow;
		this.meta.estimatedWindow = {
			level: 255,
			width: 760
		};
		this.volume = this.createMockVolume(meta);
		return this.loader.volume(this.series, this.meta)
			.then(volume => {
				this.meta.estimatedWindow = est;
				this.volume = volume;
			});
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

			rawSection.applyWindow(viewState.window.width, viewState.window.level);

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
