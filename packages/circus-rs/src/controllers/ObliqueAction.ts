/**
 * Oblique Image generator Action class
 */

import RawData from '../RawData';
import VolumeBasedController from './VolumeBasedController';
import Oblique from '../Oblique';

import http = require('http');

import logger from '../Logger';

export default class ObliqueAction extends VolumeBasedController {

	public processVolume(query: any, raw: RawData, res: http.ServerResponse): void {

		var window_width: number;
		var window_level: number;
		var base_axis: string;
		var alpha: number = 0.0;
		var center;

		if ('ww' in query) {
			window_width = query['ww'];
		}
		if ('wl' in query) {
			window_level = query['wl'];
		}
		if ('b' in query) {
			base_axis = query['b'];
		}
		if ('a' in query) {
			alpha = query['a'];
		}
		if ('c' in query) {
			center = query['c'].split(',');
		}

		if (base_axis != 'axial' && base_axis != 'coronal' && base_axis != 'sagittal') {
			this.respondBadRequest(res, 'Invalid parameter b: ' + base_axis);
			return;
		}
		if (center == null || center.length != 3) {
			this.respondBadRequest(res, 'Invalid parameter c.');
			return;
		}
		if (alpha == null) {
			this.respondBadRequest(res, 'Invalid parameter a.');
			return;
		}

		if (!window_width) {
			window_width = raw.ww;
		}
		if (!window_level) {
			window_level = raw.wl;
		}

		var result = Oblique.makeSingleOblique(raw, base_axis, center, alpha, window_width, window_level);
		res.setHeader('X-Circus-Pixel-Size', '' + result.pixel_size);
		res.setHeader('X-Circus-Pixel-Columns', '' + result.width);
		res.setHeader('X-Circus-Pixel-Rows', '' + result.height);
		res.setHeader('X-Circus-Center', '' + result.center_x + ',' + result.center_y);
		this.pngWriter.write(res, result.buffer, result.width, result.center_y);
	}

}
