/**
 * MPR Image generator class
 */
var url = require('url');

import RawData from './RawData';

import logger from './Logger';

export default class MPR  {

	// Pixel値にWindow width/levelを適用
	private static _applyWindow(width: number, level: number, offset: number, z: number, raw: RawData): number {

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

	public static makeAxial(raw: RawData, target: number, window_width: number, window_level: number): Buffer {
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

	public static makeCoronal(raw: RawData, target: number, window_width: number, window_level: number): Buffer {
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

	public static makeSagittal(raw: RawData, target: number, window_width: number, window_level: number): Buffer {
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

}
