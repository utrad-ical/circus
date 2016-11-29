import DicomVolume from '../../common/DicomVolume';
import * as express from 'express';
import * as compression from 'compression';
import { ServerHelpers } from '../ServerHelpers';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export function execute(helpers: ServerHelpers): express.RequestHandler[] {
	return [
		compression(),
		function (req: express.Request, res: express.Response, next: express.NextFunction): void {
			const vol = req.volume as DicomVolume;
			res.send(Buffer.from(vol.data));
		}
	];
}

