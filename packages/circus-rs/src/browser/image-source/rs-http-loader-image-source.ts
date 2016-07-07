'use strict';

import { Promise } from 'es6-promise';

import { DicomMetadata } from '../../browser/interface/dicom-metadata';
import { ImageSource } from './image-source';
import { RsHttpLoader } from './rs-http-loader';

/**
 * RsHttpLoaderImageSource is a base class of ImageSource classes which
 * need access to the CIRCUS RS server.
 * It fetches the scanned MPR data either from the RS server via HTTP or from the loaded volume,
 * and then draws the scanned MPR image onto the specified canvas.
 */
export abstract class RsHttpLoaderImageSource extends ImageSource {

	protected loader: RsHttpLoader;
	protected series: string;
	protected meta: DicomMetadata;
	protected prepareLoader: Promise<any>;

	protected abstract scan(param): Promise<Uint8Array>;

	constructor({ server = 'http://localhost:3000', series = null } = {}) {
		super();
		this.loader = new RsHttpLoader(server);
		this.series = series;
		this.prepareLoader = this.prepare();
	}

	public ready(): Promise<any> {
		return this.prepareLoader;
	}

	/**
	 * Does the actual preparation.
	 */
	public prepare(): Promise<any> {
		if (!this.series) return Promise.reject('Series is required');
		return this.loader.metadata(this.series)
			.then(meta => {
				this.meta = meta;
				return this.onMetaLoaded();
			});
	}

	/**
	 * Subclasses can do additional initialization/loading by this.
	 * this.meta is guaranteed to be non-null inside this.
	 */
	protected onMetaLoaded(): Promise<any> {
		return Promise.resolve();
	}

	public state() {
		const state = {
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

	public draw(canvasDomElement, viewState): Promise<void> {

		const context = canvasDomElement.getContext('2d');
		const [vpWidth, vpHeight] = viewState.resolution;
		const section = viewState.section;
		const window = viewState.window || this.meta.estimatedWindow;

		const scanParam = {
			origin: [
				Math.floor(section.origin[0] / viewState.voxelSize[0]),
				Math.floor(section.origin[1] / viewState.voxelSize[1]),
				Math.floor(section.origin[2] / viewState.voxelSize[2])
			] as [ number, number, number ],
			u: [
				section.xAxis[0] / viewState.voxelSize[0] / vpWidth,
				section.xAxis[1] / viewState.voxelSize[1] / vpWidth,
				section.xAxis[2] / viewState.voxelSize[2] / vpWidth
			] as [ number, number, number ],
			v: [
				section.yAxis[0] / viewState.voxelSize[0] / vpHeight,
				section.yAxis[1] / viewState.voxelSize[1] / vpHeight,
				section.yAxis[2] / viewState.voxelSize[2] / vpHeight
			] as [ number, number, number ],
			size: [vpWidth, vpHeight] as [ number, number ],
			ww: Number(window.width),
			wl: Number(window.level)
		};

		return this.scan(scanParam)
			.then((buffer: Uint8Array) => {
				let imageData = context.createImageData(vpWidth, vpHeight);
				let srcidx = 0, pixel, dstidx;
				for (var y = 0; y < vpHeight; y++) {
					for (var x = 0; x < vpWidth; x++) {
						pixel = buffer[srcidx];
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
