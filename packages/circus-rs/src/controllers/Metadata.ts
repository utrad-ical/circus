/**
 * DICOM image metadata process class
 */

import http = require('http');
import RawData from '../RawData';
import VolumeBasedController from './VolumeBasedController';

// import logger from '../Logger';

export default class Metadata extends VolumeBasedController {
	protected processVolume(query: any, raw: RawData, res: http.ServerResponse): void {
		var response: any = {
			x: raw.x,
			y: raw.y,
			z: raw.z,
			voxel_x: raw.vx,
			voxel_y: raw.vy,
			voxel_z: raw.vz,
			window_width: raw.ww,
			window_level: raw.wl
		};
		if (raw.dcm_ww !== null) {
			response.window_width_dicom = raw.dcm_ww;
		}
		if (raw.dcm_wl !== null) {
			response.window_level_dicom = raw.dcm_wl;
		}
		var limits: number[] = null;
		switch (raw.type) {
			case 0:
				limits = [1, 256, 0, 255];
				break;
			case 1:
				limits = [1, 256, -128, 127];
				break;
			case 2:
				limits = [1, 65536, 0, 65535];
				break;
			case 3:
				limits = [1, 65536, -32768, 32767];
				break;
			default:
				break;
		}
		if (limits !== null) {
			[response.window_width_min, response.window_width_max,
				response.window_level_min, response.window_level_max] = limits;
		}

		this.respondJson(res, response);
	}

}
