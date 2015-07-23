/**
 * MPR Image generator Action class
 */

import RawData from '../RawData';
import Controller from './Controller';
import MPR from '../MPR';

import http = require('http');

import logger from '../Logger';

export default class MPRAction extends Controller {

	public process(query: any, res: http.ServerResponse): void
	{
		var window_width;
		var window_level;

		var target = 1;
		var series = '';
		var mode = 'axial';
		var image = 'all';

		if ('target' in query) {
			target = Number(query['target']);
		}
		if ('ww' in query) {
			window_width = query['ww'];
		}
		if ('wl' in query) {
			window_level = query['wl'];
		}
		if ('series' in query) {
			series = query['series'];
		}
		if ('mode' in query) {
			mode = query['mode'];
		}
		if ('image' in query) {
			image = query['image'];
		}

		if (series == '') {
			logger.warn('no series in query');
			res.writeHead(500);
			res.end();
			return;
		}

		this.reader.readData(series, image, (raw: RawData, error: string) => {
			if (error) {
				logger.warn(error);
				res.writeHead(404);
				res.end();
				return;
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

			try {
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
					res.writeHead(400);
					res.end();
					return;
				}
				this.pngWriter.write(res, buffer, out_width, out_height);
			} catch(e) {
				logger.warn(e);
				res.writeHead(500);
				res.end();
				buffer = null;
			}

		});

	}

}
