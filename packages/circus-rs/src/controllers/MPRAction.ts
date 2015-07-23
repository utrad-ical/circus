/**
 * MPR Image generator Action class
 */

import RawData from '../RawData';
import VolumeBasedController from './VolumeBasedController';
import MPR from '../MPR';

import http = require('http');

import logger from '../Logger';

export default class MPRAction extends VolumeBasedController {

	protected processVolume(query: any, raw: RawData, res: http.ServerResponse): void
	{
		var window_width;
		var window_level;

		var target = 1;
		var mode = 'axial';
		// var image = 'all';

		if ('target' in query) {
			target = Number(query['target']);
		}
		if ('ww' in query) {
			window_width = query['ww'];
		}
		if ('wl' in query) {
			window_level = query['wl'];
		}
		if ('mode' in query) {
			mode = query['mode'];
		}

		var buffer;
		var out_width;
		var out_height;

		if (!window_width) {
			window_width = raw.ww;
		}
		if (!window_level) {
			window_level = raw.wl;
		}

		if (mode === 'axial') {
			out_width = raw.x;
			out_height = raw.y;
			buffer = MPR.makeAxial(raw, target, window_width, window_level);
		} else if (mode === 'coronal') {
			out_width = raw.x;
			out_height = raw.z;
			buffer = MPR.makeCoronal(raw, target, window_width, window_level);
		} else if (mode === 'sagittal') {
			out_width = raw.y;
			out_height = raw.z;
			buffer = MPR.makeSagittal(raw, target, window_width, window_level);
		} else {
			this.respondBadRequest(res, 'Invalid orientation.');
			return;
		}
		this.pngWriter.write(res, buffer, out_width, out_height);
	}

}
