/**
 * MPR Image generator Action class
 */
var url = require('url');

import RawData = require('../RawData');
import DicomServerModule = require('./DicomServerModule');
import MPR = require('../MPR');

import http = require('http');

import Logger = require('../Logger');
var logger = Logger.prepareLogger();

export = MPRAction;

class MPRAction extends DicomServerModule {

	public process(req: http.ServerRequest, res: http.ServerResponse): void
	{
		var u = url.parse(req.url, true);
		var query = u.query;

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
				if (mode == 'axial') {
					// 天頂方向描画
					//logger.trace('axial(top)');
					out_width = raw.x;
					out_height = raw.y;
					buffer = MPR.makeAxial(raw, target, window_width, window_level);
				} else if (mode == 'coronal') {
					//logger.trace('coronal');
					// 前方向描画
					out_width = raw.x;
					out_height = raw.z;
					buffer = MPR.makeCoronal(raw, target, window_width, window_level);
				} else if (mode == 'sagittal') {
					//logger.trace('sagittal');
					// 横方向描画
					out_width = raw.y;
					out_height = raw.z;
					buffer = MPR.makeSagittal(raw, target, window_width, window_level);
				} else {
					//logger.trace('unknown mode');
					res.writeHead(404);
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
