/**
 * Oblique Image generator Action class
 */

import RawData from '../RawData';
import VolumeBasedController from './VolumeBasedController';
import Oblique from '../Oblique';
import { ValidatorRules } from '../Validator';

import http = require('http');

import logger from '../Logger';

export default class ObliqueAction extends VolumeBasedController {

	private checkTuple(s: string): boolean {
		var tmp = s.split(',').map(parseFloat);
		return (tmp.length === 3);
	}

	protected getRules(): ValidatorRules
	{
		return {
			series: ['Series UID', null, 'isLength:1:200', null],
			ww: ['Window width', null, 'isFloat', 'toFloat'],
			wl: ['Window width', null, 'isFloat', 'toFloat'],
			a: ['Angle', 0, 'isFloat', 'toFloat'],
			b: ['Base axis', 'axial', /^axial|coronal|sagittal$/, (s) => s.toLowerCase()],
			c: ['Center', [0,0,0], this.checkTuple, (s) => s.split(',').map(parseFloat)]
		};
	}

	public processVolume(query: any, raw: RawData, res: http.ServerResponse): void {

		var { ww, wl, a, b, c } = query;

		if (ww === null) ww = raw.ww;
		if (wl === null) wl = raw.wl;

		var result = Oblique.makeSingleOblique(raw, b, c, a, ww, wl);
		res.setHeader('X-Circus-Pixel-Size', '' + result.pixel_size);
		res.setHeader('X-Circus-Pixel-Columns', '' + result.width);
		res.setHeader('X-Circus-Pixel-Rows', '' + result.height);
		res.setHeader('X-Circus-Center', '' + result.center_x + ',' + result.center_y);
		res.setHeader('Access-Control-Expose-Headers', 'X-Circus-Pixel-Size, X-Circus-Pixel-Columns, X-Circus-Pixel-Rows, X-Circus-Center');
		this.imageEncoder.write(res, result.buffer, result.width, result.height);
	}

}
