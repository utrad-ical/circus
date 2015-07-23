/**
 * Single oblique image generator class
 */

import RawData from './RawData';
import logger from './Logger';

interface ObliqueResult {
	buffer: Buffer;
	width:  number;
	height: number;
	pixel_size: number;
	center_x: number;
	center_y: number;
}

export default class Oblique {

	private static _getArrayValueWithApplyWindow(raw: RawData, pos_x: number, pos_y: number, pos_z: number,
												 window_width: number, window_level: number): number {

		var ix = Math.floor(pos_x);
		var iy = Math.floor(pos_y);
		var iz = Math.floor(pos_z);
		var x_end = raw.x - 1;
		var y_end = raw.y - 1;
		var z_end = raw.z - 1;

		if (pos_x < 0.0 || pos_y < 0.0 || pos_z < 0.0 || pos_x > x_end || pos_y > y_end || pos_z > z_end) {
			return 0;
		}

		if (iz >= z_end) {
			iz = z_end - 1;
			pos_z = z_end;
		}

		// trilinear interpolation
		var izp1 = iz + 1;
		var weight_z2 = pos_z - iz;
		var weight_z1 = 1.0 - weight_z2;

		var z1 = raw.getPixelFromAxialWithInterpolation(pos_x, pos_y, iz);
		var z2 = raw.getPixelFromAxialWithInterpolation(pos_x, pos_y, izp1);
		var interpolated_value = z1 * weight_z1 + z2 * weight_z2;

		// Apply window_level, window_width
		var value = Math.round((interpolated_value - window_level + window_width / 2) * (255 / window_width));
		if (value >= 255) {
			value = 255;
		} else if (value < 0) {
			value = 0;
		}
		return value;
	}

	public static makeSingleOblique(raw: RawData, base_axis: string, center: [number, number, number], alpha: number,
									window_width: number, window_level: number): ObliqueResult {

		var eu_x: number = 0.0;
		var eu_y: number = 0.0;
		var eu_z: number = 0.0;
		var ev_x: number = 0.0;
		var ev_y: number = 0.0;
		var ev_z: number = 0.0;
		var origin_x: number = 0;
		var origin_y: number = 0;
		var origin_z: number = 0;

		var width: number = 0;
		var height: number = 0;
		var pixel_size: number = Math.min(raw.vx, Math.min(raw.vy, raw.vz));
		var center_x = 0;
		var center_y = 0;

		// Set parameters
		if (base_axis === 'axial') {
			eu_x = Math.cos(alpha) * pixel_size / raw.vx;
			eu_y = -1.0 * Math.sin(alpha) * pixel_size / raw.vy;
			ev_z = pixel_size / raw.vz;

			var px = center[0];
			var py = center[1];
			var minus_cnt = 0;
			var plus_cnt = 0;

			while (1) {
				px -= eu_x;
				py -= eu_y;
				if (px < 0.0 || py < 0.0 || px > raw.x - 1 || py > raw.y - 1)  break;
				minus_cnt++;
			}

			origin_x = px;
			origin_y = py;
			center_x = minus_cnt;
			center_y = Math.floor(center[2] * raw.vz / pixel_size);
			px = center[0];
			py = center[1];

			while (1) {
				px += eu_x;
				py += eu_y;
				if (px < 0.0 || py < 0.0 || px > raw.x - 1 || py > raw.y - 1)  break;
				plus_cnt++;
			}

			width = minus_cnt + plus_cnt + 1;
			height = Math.floor(raw.z * raw.vz / pixel_size);

		} else if (base_axis === 'coronal') {
			eu_x = Math.cos(alpha) * pixel_size / raw.vx;
			eu_z = -1.0 * Math.sin(alpha) * pixel_size / raw.vz;
			ev_y = pixel_size / raw.vy;

			var px = center[0];
			var py = center[2];
			var minus_cnt = 0;
			var plus_cnt = 0;

			while (1) {
				px -= eu_x;
				py -= eu_z;
				if (px < 0.0 || py < 0.0 || px > raw.x - 1 || py > raw.z - 1)  break;
				minus_cnt++;
			}

			origin_x = px;
			origin_z = py;
			center_x = minus_cnt;
			center_y = Math.floor(center[1] * raw.vy / pixel_size);
			px = center[0];
			py = center[2];

			while (1) {
				px += eu_x;
				py += eu_z;
				if (px < 0.0 || py < 0.0 || px > raw.x - 1 || py > raw.z - 1)  break;
				plus_cnt++;
			}

			width = minus_cnt + plus_cnt + 1;
			height = Math.floor(raw.y * raw.vy / pixel_size);

		} else if (base_axis === 'sagittal') {
			eu_x = pixel_size / raw.vx;
			ev_y = Math.cos(alpha) * pixel_size / raw.vy;
			ev_z = -1.0 * Math.sin(alpha) * pixel_size / raw.vz;

			var px = center[1];
			var py = center[2];
			var minus_cnt = 0;
			var plus_cnt = 0;

			while (1) {
				px -= ev_y;
				py -= ev_z;
				if (px < 0.0 || py < 0.0 || px > raw.y - 1 || py > raw.z - 1)  break;
				minus_cnt++;
			}

			origin_y = px;
			origin_z = py;
			center_x = Math.floor(center[0] * raw.vx / pixel_size);
			center_y = minus_cnt;
			px = center[1];
			py = center[2];

			while (1) {
				px += ev_y;
				py += ev_z;
				if (px < 0.0 || py < 0.0 || px > raw.x - 1 || py > raw.z - 1)  break;
				plus_cnt++;
			}

			width = Math.floor(raw.x * raw.vx / pixel_size);
			height = minus_cnt + plus_cnt + 1;

		} else {
			return null;
		}
		//console.log(img_width + ', ' + img_height);

		// Create oblique image
		var x = origin_x;
		var y = origin_y;
		var z = origin_z;

		var buffer = new Buffer(width * height);
		var buffer_offset = 0;

		for (var j = 0; j < height; j++) {
			var pos_x = x;
			var pos_y = y;
			var pos_z = z;

			for (var i = 0; i < width; i++) {

				var value = 0;

				if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0
					&& pos_x <= raw.x - 1 && pos_y <= raw.y - 1 && pos_z <= raw.z - 1) {
					value = this._getArrayValueWithApplyWindow(raw, pos_x, pos_y, pos_z, window_width, window_level);
				}

				buffer.writeUInt8(value, buffer_offset);
				buffer_offset++;

				pos_x += eu_x;
				pos_y += eu_y;
				pos_z += eu_z;
			}
			x += ev_x;
			y += ev_y;
			z += ev_z;
		}

		return {buffer, width, height, pixel_size, center_x, center_y}
	}
}
