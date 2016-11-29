import * as express from 'express';
import { ServerHelpers } from '../../ServerHelpers';

/**
 * Handles 'metadata' endpoint which gives general information
 * of the specified series.
 */
export function execute(helpers: ServerHelpers): express.RequestHandler {
	return function(req: express.Request, res: express.Response, next: express.NextFunction): void {
		const vol = req.volume;
		const response: any = {
			voxelCount: vol.getDimension(),
			voxelSize: vol.getVoxelSize(),
			estimatedWindow: vol.estimatedWindow,
			dicomWindow: vol.dicomWindow,
			pixelFormat: vol.getPixelFormat()
		};
		res.json(response);
	};
}

