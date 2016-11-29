import * as express from 'express';
import DicomVolume from '../../common/DicomVolume';
import AsyncLruCache from '../../common/AsyncLruCache';
import Logger from '../loggers/Logger';
import ImageEncoder from '../image-encoders/ImageEncoder';

/**
 * Handles 'metadata' endpoint which gives general information
 * of the specified series.
 */
export function execute(
	logger: Logger, reader: AsyncLruCache<DicomVolume>, imageEncoder: ImageEncoder
): express.RequestHandler {
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

