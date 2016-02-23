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
			series: ['Series UID', null, this.isUID, null],
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		let dim = vol.getDimension();
		let vd = vol.getVoxelDimension();
		let response: any = {
			voxelCount: dim,
			voxelSize: vd,
			estimatedWindow: { width: vol.ww, level: vol.wl },
			pixelFormat: vol.getPixelFormat()
		};
		if (vol.dcm_ww !== null && vol.dcm_wl !== null) {
			response.dicomWindow = { width: vol.dcm_ww, level: vol.dcm_wl };
		}
		this.respondJson(res, response);
	}

}
