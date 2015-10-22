/**
 * DICOM image metadata process class
 */

import http = require('http');
import { PixelFormat } from '../RawData';
import DicomVolume from '../DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../Validator';

// import logger from '../Logger';

export default class Metadata extends VolumeBasedController {

	protected getRules(): ValidatorRules
	{
		return {
			series: ['Series UID', null, 'isLength:1:200', null],
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		var dim = vol.getDimension();
		var vd = vol.getVoxelDimension();
		var response: any = {
			x: dim[0],
			y: dim[1],
			z: dim[2],
			voxel_x: vd[0],
			voxel_y: vd[1],
			voxel_z: vd[2],
			window_width: vol.ww,
			window_level: vol.wl
		};
		if (vol.dcm_ww !== null) {
			response.window_width_dicom = vol.dcm_ww;
		}
		if (vol.dcm_wl !== null) {
			response.window_level_dicom = vol.dcm_wl;
		}
		var limits: number[] = null;
		switch (vol.getPixelFormat()) {
			case PixelFormat.UInt8:
				limits = [1, 256, 0, 255];
				break;
			case PixelFormat.Int8:
				limits = [1, 256, -128, 127];
				break;
			case PixelFormat.UInt16:
				limits = [1, 65536, 0, 65535];
				break;
			case PixelFormat.Int16:
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
