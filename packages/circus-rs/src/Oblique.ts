/**
 * Single oblique image generator class
 */

import RawData = require('./RawData');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = Oblique;

class Oblique  {

	private static _getArrayValueWithApplyWindow(raw: RawData, pos_x: number, pos_y: number, pos_z: number,
												 window_width: number, window_level: number): number {

		var ix = Math.floor(pos_x);
		var iy = Math.floor(pos_y);
		var iz = Math.floor(pos_z);
		var x_end = raw.x - 1;
		var y_end = raw.y - 1;
		var z_end = raw.z - 1;
		var X = pos_x;
		var Y = pos_y;
		var Z = pos_z;

		if (X < 0.0 || Y < 0.0 || Z < 0.0 || X > x_end || Y > y_end || Z > z_end) {
			return -1;
		}

		if (iz >= z_end) {
			iz = z_end - 1;  Z = z_end;
		}

		// trilinear interpolation
		var izp1 = iz + 1;
		var weight_z2 = Z - iz;
		var weight_z1 = 1.0 - weight_z2;

		var z1 = raw.getPixelFromAxialWithInterpolation(X, Y, iz);
		var z2 = raw.getPixelFromAxialWithInterpolation(X, Y, izp1);
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

	/////////////////////////////////////////////

	public static makeSingleOblique(raw: RawData, base_axis: string, center: [number, number, number], alpha: number,
									window_width: number, window_level: number): [Buffer, number, number, number, number, number] {

		var eu_x:number = 0.0;
		var eu_y:number = 0.0;
		var eu_z:number = 0.0;
		var ev_x:number = 0.0;
		var ev_y:number = 0.0;
		var ev_z:number = 0.0;
		var origin_x:number = Math.floor(raw.x/2);
		var origin_y:number = Math.floor(raw.y/2);
		var origin_z:number = Math.floor(raw.z/2);
		var dst_img_width:number  = 0;
		var dst_img_height:number = 0;
		var dst_pixel_size:number = Math.min(raw.vx, Math.min(raw.vy, raw.vz));
		var dw:number = 0.0;
		var offset;
		var buffer_offset = 0;

		// Set parameters
	    if (base_axis == 'axial') {
			var dw = Math.sqrt(Math.pow(raw.x * raw.vx, 2.0) + Math.pow(raw.y * raw.vy, 2.0));
			dst_img_width  = 2 * Math.floor(dw / dst_pixel_size);
			dst_img_height = 2 * Math.floor(raw.z * raw.vz / dst_pixel_size);

			eu_x = Math.cos(alpha) * dst_pixel_size / raw.vx;
			eu_y = -1.0 * Math.sin(alpha) * dst_pixel_size / raw.vy;
			ev_z = dst_pixel_size / raw.vz;
			origin_x = center[0] - eu_x * 0.5 * dst_img_width;
			origin_y = center[1] - eu_y * 0.5 * dst_img_width;
			origin_z = center[2] - ev_z * 0.5 * dst_img_height;

		} else if (base_axis == 'coronal') {
			var dw = Math.sqrt(Math.pow(raw.x * raw.vx, 2.0) + Math.pow(raw.z * raw.vz, 2.0));
			dst_img_width  = 2 * Math.floor(dw / dst_pixel_size);
			dst_img_height = 2 * Math.floor(raw.y * raw.vy / dst_pixel_size);

			eu_x = Math.cos(alpha) * dst_pixel_size / raw.vx;
			eu_z = -1.0 * Math.sin(alpha) * dst_pixel_size / raw.vz;
			ev_y = dst_pixel_size / raw.vy;
			origin_x = center[0] - eu_x * 0.5 * dst_img_width;
			origin_y = center[1] - ev_y * 0.5 * dst_img_height;
			origin_z = center[2] - eu_z * 0.5 * dst_img_width;

		} else if (base_axis == 'sagittal') {
			var dw = Math.sqrt(Math.pow(raw.y * raw.vy, 2.0) + Math.pow(raw.z * raw.vz, 2.0));
			dst_img_width  = 2 * Math.floor(raw.x * raw.vx / dst_pixel_size);
			dst_img_height = 2 * Math.floor(dw / dst_pixel_size);

			eu_x = dst_pixel_size / raw.vx;
			ev_y = Math.cos(alpha) * dst_pixel_size / raw.vy;
			ev_z = -1.0 * Math.sin(alpha) * dst_pixel_size / raw.vz;

			origin_x = center[0] - eu_x * 0.5 * dst_img_width;
			origin_y = center[1] - ev_y * 0.5 * dst_img_height;
			origin_z = center[2] - ev_z * 0.5 * dst_img_height;
		} else {
			return null;
		}
		//console.log(dst_img_width + ', ' + dst_img_height);

		// Create oblique image
		var x = origin_x;
		var y = origin_y;
		var z = origin_z;

		var min_x = dst_img_width - 1;
		var min_y = dst_img_height - 1;
		var max_x = 0;
		var max_y = 0;

		var buffer = new Buffer(dst_img_width * dst_img_height);

		for (var j = 0; j < dst_img_height; j++) {
			var pos_x = x;
			var pos_y = y;
			var pos_z = z;

			for (var i = 0; i < dst_img_width; i++) {

				var value = -1;

				if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0
					&& pos_x <= raw.x - 1 && pos_y <= raw.y - 1 && pos_z <= raw.z -1) {
					offset = j * dst_img_width + i;
					value = this._getArrayValueWithApplyWindow(raw, pos_x, pos_y, pos_z, window_width, window_level);
				}

				if (value > 0) {
					if (i < min_x)  min_x = i;
					if (j < min_y)  min_y = j;
					if (max_x < i)  max_x = i;
					if (max_y < j)  max_y = j;
				} else {
					value = 0;
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

		// Cropping
		var cropped_width  = max_x - min_x + 1;
		var cropped_height = max_y - min_y + 1;
		var dst_center_x = dst_img_width / 2 - min_x;
		var dst_center_y = dst_img_height / 2 - min_y;

		var cropped_buffer = new Buffer(cropped_width * cropped_height);
		var cropped_buffer_offset = 0;
		buffer_offset = 0;

		for (var j = 0; j < dst_img_height; j++) {
			for (var i = 0; i < dst_img_width; i++) {
				if (j >= min_y && j <= max_y && i >= min_x && i <= max_x) {
					cropped_buffer.writeUInt8(buffer.readUInt8(buffer_offset), cropped_buffer_offset);
					cropped_buffer_offset++;
				}
				buffer_offset++;
			}
		}
		return [cropped_buffer, cropped_width, cropped_height, dst_center_x, dst_center_y, dst_pixel_size];
	}
}
