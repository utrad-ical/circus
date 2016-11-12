import * as express from 'express';
import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';

/**
 * Handles 'metadata' endpoint which gives general information
 * of the specified series.
 */
export default class Metadata extends VolumeBasedController {

	protected processVolume(
		req: express.Request, res: express.Response, next: express.NextFunction
	): void {
		const vol = req.volume;
		const dim = vol.getDimension();
		const vd = vol.getVoxelDimension();
		const response: any = {
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
