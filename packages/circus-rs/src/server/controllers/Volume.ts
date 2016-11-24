import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';

import * as express from 'express';
import * as stream from 'stream';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export default class Volume extends VolumeBasedController {

	protected processVolume(
		req: express.Request, res: express.Response, next: express.NextFunction
	): void {
		const vol = req.volume as DicomVolume;
		const zmax: number = vol.getDimension()[2];
		const out: any = new stream.Readable();
		let z: number = 0;
		out._read = function(size): void {
			if (z >= zmax) {
				this.push(null); // ends stream
				return;
			}
			const slice = vol.getSingleImage(z);
			this.push(new Buffer(new Uint8Array(slice)));
			z++;
		};
		this.respondGzippedStream(res, out);
	}

}
