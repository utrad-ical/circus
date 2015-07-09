/**
 * MPR Image generator class
 */
var url = require('url');

import RawData = require('./RawData');
import DicomReader = require('./DicomReader');
import DicomServerModule = require('./DicomServerModule');
import PNGWriter = require('./PNGWriter');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = MPR;

class MPR extends DicomServerModule {

	private pngWriter: PNGWriter;

	protected initialize() {
		super.initialize();

		var pngModule = require('./' + this.config.options.pngWriter);
		this.pngWriter = new pngModule(this.config.options.pngWriterOptions);
	}


	// Pixel値にWindow width/levelを適用
	private _applyWindow(width: number, level: number, offset: number, z: number, raw: RawData): number {

		var pixel = raw.getPixel(z, offset);

		var value = Math.round((pixel - level + width / 2) * (255 / width));
		if (value >= 255) {
			value = 255;
		} else if (value < 0) {
			value = 0;
		}
		return value;
	}

	/////////////////////////////////////////////

	makeAxial(raw: RawData, target: number, window_width: number, window_level: number): Buffer {
		var buffer_offset = 0;
		var offset;
		var value;

		var buffer = new Buffer(raw.x * raw.y)

		for (var y = 0; y < raw.y; y++) {
			for (var x = 0; x < raw.x; x++) {
				//		logger.trace('x: ' + x + ' y:' + y + ' target:' + target);
				offset = y * raw.x + x;
				value = this._applyWindow(window_width, window_level, offset, target, raw);
				buffer.writeUInt8(value, buffer_offset);
				buffer_offset++;
			}
		}
		return buffer;
	}

	makeCoronal(raw: RawData, target: number, window_width: number, window_level: number): Buffer {
		var buffer_offset = 0;
		var offset;
		var value;

		var buffer = new Buffer(raw.x * raw.z);

		for (var z = 0; z < raw.z; z++) {
			for (var x = 0; x < raw.x; x++) {
				offset = target * raw.x + x;
				value = this._applyWindow(window_width, window_level, offset, z, raw);
				buffer.writeUInt8(value, buffer_offset);
				buffer_offset++;
			}
		}
		return buffer;
	}

	makeSagittal(raw: RawData, target: number, window_width: number, window_level: number): Buffer {
		var buffer_offset = 0;
		var offset;
		var value;

		var buffer = new Buffer(raw.y * raw.z);

		for (var y = 0; y < raw.z; y++) {
			for (var x = 0; x < raw.y; x++) {
				offset = x * raw.x + target;
				value = this._applyWindow(window_width, window_level, offset, y, raw);
				buffer.writeUInt8(value, buffer_offset);
				buffer_offset++;
			}
		}
		return buffer;
	}

	public process(req: any, res: any, reader: DicomReader): void
	{
		var u = url.parse(req.url, true);
		var query = u.query;

		var window_width;
		var window_level;

		var target = 1;
		var maxZ = 261;
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

		reader.readData(series, image, (raw: any, error: string) => {
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
					buffer = this.makeAxial(raw, target, window_width, window_level);
				} else if (mode == 'coronal') {
					//logger.trace('coronal');
					// 前方向描画
					out_width = raw.x;
					out_height = raw.z;
					buffer = this.makeCoronal(raw, target, window_width, window_level);
				} else if (mode == 'sagittal') {
					//logger.trace('sagittal');
					// 横方向描画
					out_width = raw.y;
					out_height = raw.z;
					buffer = this.makeSagittal(raw, target, window_width, window_level);
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
