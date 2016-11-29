import DicomVolume from '../../common/DicomVolume';
import * as express from 'express';
import * as compression from 'compression';
import Logger from '../loggers/Logger';
import AsyncLruCache from '../../common/AsyncLruCache';
import RawData from '../../common/RawData';
import ImageEncoder from '../image-encoders/ImageEncoder';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export function execute(
	logger: Logger, reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder
): express.RequestHandler[] {
	return [
		compression(),
		function (req: express.Request, res: express.Response, next: express.NextFunction): void {
			const vol = req.volume as DicomVolume;
			res.send(Buffer.from(vol.data));
		}
	];
}

