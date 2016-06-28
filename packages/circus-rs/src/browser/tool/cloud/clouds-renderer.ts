'use strict';

import { VoxelCloud } from '../../../common/VoxelCloud';
import { Painter } from '../../../browser/interface/painter';
import { Sprite } from '../../../browser/viewer/sprite';

export class CloudsRenderer implements Painter {

	public clouds: VoxelCloud[];

	constructor() {
		this.clouds = [];
	}

	public draw(canvasDomElement, viewState): Sprite {
		// return this.drawByRawSection( canvasDomElement, viewState );
		return this.drawByScanOblique(canvasDomElement, viewState);
	}

	public drawByRawSection(canvasDomElement, viewState): Sprite {

		let context = canvasDomElement.getContext('2d');
		let section = viewState.section;
		let size = viewState.resolution;

		let imageData = context.getImageData(0, 0, size[0], size[1]);
		let transparency = 0;

		this.clouds.forEach((cloud) => {

			let color = cloud.color || [0xff, 0, 0, 0xff];

			let rawSection = cloud.mmGetSection(
				section.origin,
				section.xAxis,
				section.yAxis,
				size,
				false
			);

			let srcidx = 0, pixel, dstidx;
			for (var y = 0; y < size[1]; y++) {
				for (var x = 0; x < size[0]; x++) {
					pixel = rawSection.read(srcidx);
					dstidx = srcidx << 2; // meaning multiply 4
					if (pixel !== transparency) {
						imageData.data[dstidx] = ( imageData.data[dstidx] * ( 0xff - color[3] ) + color[0] * color[3] ) / 0xff;
						imageData.data[dstidx + 1] = ( imageData.data[dstidx + 1] * ( 0xff - color[3] ) + color[1] * color[3] ) / 0xff;
						imageData.data[dstidx + 2] = ( imageData.data[dstidx + 2] * ( 0xff - color[3] ) + color[2] * color[3] ) / 0xff;
						imageData.data[dstidx + 3] = color[3];
					}
					srcidx++;
				}
			}

		});

		context.putImageData(imageData, 0, 0);
		return null;
	}

	public drawByScanOblique(canvasDomElement, viewState): Sprite {

		let size = [canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height')].map(
			i => Math.round(i));
		let context = canvasDomElement.getContext('2d');

		/**
		 * get imageBuffer
		 */
		let u = viewState.section.xAxis.map((i) => i / size[0]);
		let v = viewState.section.yAxis.map((i) => i / size[1]);

		let imageData = context.getImageData(0, 0, size[0], size[1]);

		let translateValue = 0;

		this.clouds.forEach((cloud) => {

			let color = cloud.color || [0xff, 0, 0, 0xff];
			let imageBuffer = new Uint8Array(size[0] * size[1]);
			let vs = cloud.getVoxelDimension();
			let o = viewState.section.origin;

			cloud.scanOblique(
				[o[0] / vs[0], o[1] / vs[1], o[2] / vs[2]],
				[u[0] / vs[0], u[1] / vs[1], u[2] / vs[2]],
				[v[0] / vs[0], v[1] / vs[1], v[2] / vs[2]],
				size as any,
				imageBuffer,
				1, 0.5
			);

			let srcidx = 0, pixel, dstidx;
			for (var y = 0; y < size[1]; y++) {
				for (var x = 0; x < size[0]; x++) {
					pixel = imageBuffer[srcidx];
					dstidx = srcidx << 2; // meaning multiply 4
					if (pixel !== translateValue) {
						imageData.data[dstidx] = ( imageData.data[dstidx] * ( 0xff - color[3] ) + color[0] * color[3] ) / 0xff;
						imageData.data[dstidx + 1] = ( imageData.data[dstidx + 1] * ( 0xff - color[3] ) + color[1] * color[3] ) / 0xff;
						imageData.data[dstidx + 2] = ( imageData.data[dstidx + 2] * ( 0xff - color[3] ) + color[2] * color[3] ) / 0xff;
						// imageData.data[dstidx + 3] = color[3];
						imageData.data[dstidx + 3] = Math.round(pixel / 1.0 * 0xff);
					}
					srcidx++;
				}
			}

		});

		context.putImageData(imageData, 0, 0);
		return null;
	}

}

