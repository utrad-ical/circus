import * as http from 'http';
import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';

// import logger from '../Logger';

/**
 * DICOM image metadata process class
 */
export default class Metadata extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, 'isLength:1:200', null],
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		let dim = vol.getDimension();
		let vd = vol.getVoxelDimension();
		let response: any = {
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
		let info = vol.getPixelFormatInfo();
		response.window_width_min = info.minWidth;
		response.window_width_max = info.maxWidth;
		response.window_level_min = info.minLevel;
		response.window_level_max = info.maxLevel;
		response.bytes_per_voxel = info.bpp;

		this.respondJson(res, response);
	}

}
