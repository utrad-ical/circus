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
		const response: any = {
			voxelCount: vol.getDimension(),
			voxelSize: vol.getVoxelSize(),
			estimatedWindow: vol.estimatedWindow,
			dicomWindow: vol.dicomWindow,
			pixelFormat: vol.getPixelFormat()
		};
		this.respondJson(res, response);
	}

}
