/**
 * Oblique Image generator Action class
 */

import DicomVolume from '../DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../Validator';

import * as http from 'http';

// import logger from '../Logger';

export default class ObliqueAction extends VolumeBasedController {

	private checkTuple(s: string): boolean {
		let tmp = s.split(',').map(parseFloat);
		return (tmp.length === 3);
	}

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, 'isLength:1:200', null],
			ww: ['Window width', null, 'isFloat', 'toFloat'],
			wl: ['Window width', null, 'isFloat', 'toFloat'],
			a: ['Angle', 0, 'isFloat', 'toFloat'],
			b: ['Base axis', 'axial', /^axial|coronal|sagittal$/, (s) => s.toLowerCase()],
			c: ['Center', [0, 0, 0], this.checkTuple, (s) => s.split(',').map(parseFloat)]
		};
	}

	public processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {

		let { ww, wl, a, b, c } = query;

		if (ww === null) ww = vol.ww;
		if (wl === null) wl = vol.wl;

		vol.singleOblique(b, c, a, ww, wl)
			.then(result => {
				res.setHeader('X-Circus-Pixel-Size', '' + result.pixelSize);
				res.setHeader('X-Circus-Pixel-Columns', '' + result.outWidth);
				res.setHeader('X-Circus-Pixel-Rows', '' + result.outHeight);
				res.setHeader('X-Circus-Center', '' + result.centerX + ',' + result.centerY);
				res.setHeader(
					'Access-Control-Expose-Headers',
					'X-Circus-Pixel-Size, X-Circus-Pixel-Columns, X-Circus-Pixel-Rows, X-Circus-Center'
				);
				this.respondImage(res, new Buffer(result.image), result.outWidth, result.outHeight);
			});
	}

}
