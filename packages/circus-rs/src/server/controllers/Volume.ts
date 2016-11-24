import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import * as express from 'express';
import * as stream from 'stream';
import * as compression from 'compression';
import Logger from '../loggers/Logger';
import AsyncLruCache from '../../common/AsyncLruCache';
import RawData from '../../common/RawData';
import ImageEncoder from '../image-encoders/ImageEncoder';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export default class Volume extends VolumeBasedController {

	public middleware(
		logger: Logger, reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder
	): express.Handler[] {
		return [
			compression(),
			...super.middleware(logger, reader, imageEncoder)
		];
	}

	protected processVolume(
		req: express.Request, res: express.Response, next: express.NextFunction
	): void {
		const vol = req.volume as DicomVolume;
		res.send(Buffer.from(vol.data));
	}

}
