/**
 * Single oblique image generator class
 */
var url = require('url');

import RawData = require('./RawData');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = Oblique;

class Oblique  {

	private static _getArrayValueWithApplyWindow(raw: RawData, pos: [number, number, number],
												 window_width: number, window_level: number): number {

		var ix = Math.floor(pos[0]);
		var iy = Math.floor(pos[1]);
		var iz = Math.floor(pos[2]);
		var x_end = raw.x - 1;
		var y_end = raw.y - 1;
		var z_end = raw.z - 1;
		var X, Y, Z;

		if (pos[0] < 0.0 || pos[1] < 0.0 || pos[2] < 0.0 || pos[0] > x_end || pos[1] > y_end || pos[2] > z_end) {
			return -1;
		}

		if (ix >= x_end) {
			ix = x_end - 1;  X = x_end;
		} else {
			X = pos[0];
		}

		if (iy >= y_end) {
			iy = y_end - 1;  Y = y_end;
		} else {
			Y = pos[1];
		}

		if (iz >= z_end) {
			iz = z_end - 1;  Z = z_end;
		} else {
			Z = pos[2];
		}

		// trilinear interpolation
		var ixp1 = ix + 1;
		var iyp1 = iy + 1;
		var izp1 = iz + 1;

		var weight_x2 = X - ix;
		var weight_x1 = 1.0 - weight_x2;
		var weight_y2 = Y - iy;
		var weight_y1 = 1.0 - weight_y2;
		var weight_z2 = Z - iz;
		var weight_z1 = 1.0 - weight_z2;

		var v0 =  raw.getPixel(iz,   ix   + iy   * raw.x);
		var v1 =  raw.getPixel(iz,   ixp1 + iy   * raw.x);
		var v2 =  raw.getPixel(iz,   ix   + iyp1 * raw.x);
		var v3 =  raw.getPixel(iz,   ixp1 + iy   * raw.x);
		var v4 =  raw.getPixel(izp1, ix   + iy   * raw.x);
		var v5 =  raw.getPixel(izp1, ixp1 + iy   * raw.x);
		var v6 =  raw.getPixel(izp1, ix   + iyp1 * raw.x);
		var v7 =  raw.getPixel(izp1, ixp1 + iy   * raw.x);

		var value_z1y1 = v0 * weight_x1 + v1 * weight_x2;
		var value_z1y2 = v2 * weight_x1 + v3 * weight_x2;
		var value_z1   = value_z1y1 * weight_y1 + value_z1y2 * weight_y2;
		var value_z2y1 = v4 * weight_x1 + v5 * weight_x2;
		var value_z2y2 = v6 * weight_x1 + v7 * weight_x2;
		var value_z2   = value_z2y1 * weight_y1 + value_z2y2 * weight_y2;
		var interpolated_value  = value_z1 * weight_z1 + value_z2 * weight_z2;

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

		var eu: [number, number, number] = [0.0, 0.0, 0.0];
		var ev: [number, number, number] = [0.0, 0.0, 0.0];
		var origin: [number, number, number] = [Math.floor(raw.x/2), Math.floor(raw.y/2), Math.floor(raw.z/2)];
		var dst_img_size: [number, number] = [0, 0];
		var dst_pixel_size:number = Math.min(raw.vx, Math.min(raw.vy, raw.vz));
		var dw:number = 0.0;
		var offset;
		var buffer_offset = 0;

		// Set parameters
	    if (base_axis == 'axial') {
			var dw = Math.sqrt(Math.pow(raw.x * raw.vx, 2.0) + Math.pow(raw.y * raw.vy, 2.0));
			dst_img_size[0] = 2 * Math.floor(dw / dst_pixel_size);
			dst_img_size[1] = 2 * Math.floor(raw.z * raw.vz / dst_pixel_size);

			eu[0] = Math.cos(alpha) * dst_pixel_size / raw.vx;
			eu[1] = -1.0 * Math.sin(alpha) * dst_pixel_size / raw.vy;
			ev[2] = dst_pixel_size / raw.vz;
			origin[0] = center[0] - eu[0] * 0.5 * dst_img_size[0];
			origin[1] = center[1] - eu[1] * 0.5 * dst_img_size[0];
			origin[2] = center[2] - ev[2] * 0.5 * dst_img_size[1];

		} else if (base_axis == 'coronal') {
			var dw = Math.sqrt(Math.pow(raw.x * raw.vx, 2.0) + Math.pow(raw.z * raw.vz, 2.0));
			dst_img_size[0] = 2 * Math.floor(dw / dst_pixel_size);
			dst_img_size[1] = 2 * Math.floor(raw.y * raw.vy / dst_pixel_size);

			eu[0] = Math.cos(alpha) * dst_pixel_size / raw.vx;
			eu[2] = -1.0 * Math.sin(alpha) * dst_pixel_size / raw.vz;
			ev[1] = dst_pixel_size / raw.vy;
			origin[0] = center[0] - eu[0] * 0.5 * dst_img_size[0];
			origin[1] = center[1] - ev[1] * 0.5 * dst_img_size[1];
			origin[2] = center[2] - eu[2] * 0.5 * dst_img_size[0];

		} else if (base_axis == 'sagittal') {
			var dw = Math.sqrt(Math.pow(raw.y * raw.vy, 2.0) + Math.pow(raw.z * raw.vz, 2.0));
			dst_img_size[0] = 2 * Math.floor(raw.x * raw.vx / dst_pixel_size);
			dst_img_size[1] = 2 * Math.floor(dw / dst_pixel_size);

			eu[0] = dst_pixel_size / raw.vx;
			ev[1] = Math.cos(alpha) * dst_pixel_size / raw.vy;
			ev[2] = -1.0 * Math.sin(alpha) * dst_pixel_size / raw.vz;

			origin[0] = center[0] - eu[0] * 0.5 * dst_img_size[0];
			origin[1] = center[1] - ev[1] * 0.5 * dst_img_size[1];
			origin[2] = center[2] - ev[2] * 0.5 * dst_img_size[1];
		} else {
			return null;
		}
		//console.log(dst_img_size[0] + ', ' + dst_img_size[1]);

		// Create oblique image
		var x = origin[0];
		var y = origin[1];
		var z = origin[2];

		var min_x = dst_img_size[0] - 1;
		var min_y = dst_img_size[1] - 1;
		var max_x = 0;
		var max_y = 0;

		var buffer = new Buffer(dst_img_size[0] * dst_img_size[1]);

		for (var j = 0; j < dst_img_size[1]; j++) {
			var pos: [number, number, number] = [x, y, z];

			for (var i = 0; i < dst_img_size[0]; i++) {

				offset = j * dst_img_size[0] + i;
				var value = this._getArrayValueWithApplyWindow(raw, pos, window_width, window_level);

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

				pos[0] += eu[0];
				pos[1] += eu[1];
				pos[2] += eu[2];
			}
			x += ev[0];
			y += ev[1];
			z += ev[2];
		}

		// Cropping
		var cropped_width  = max_x - min_x + 1;
		var cropped_height = max_y - min_y + 1;
		var dst_center_x = dst_img_size[0] / 2 - min_x;
		var dst_center_y = dst_img_size[1] / 2 - min_y;

		var cropped_buffer = new Buffer(cropped_width * cropped_height);
		var cropped_buffer_offset = 0;
		buffer_offset = 0;

		for (var j = 0; j < dst_img_size[1]; j++) {
			for (var i = 0; i < dst_img_size[0]; i++) {
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
