import * as express from 'express';
import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';

/**
 * Handles 'metadata' endpoint which gives general information
 * of the specified series.
 */
export default class Metadata extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, this.isUID, null],
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: express.Response): void {
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
