import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';

import * as express from 'express';
import * as stream from 'stream';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export default class Volume extends VolumeBasedController {

	protected processVolume(req: express.Request, vol: DicomVolume, res: express.Response): void {
		let z: number = 0;
		let zmax: number = vol.getDimension()[2];
		let out: any = new stream.Readable();
		out._read = function(size): void {
			if (z >= zmax) {
				this.push(null); // ends stream
				return;
			}
			let slice = vol.getSingleImage(z);
			this.push(new Buffer(new Uint8Array(slice)));
			z++;
		};
		this.respondGzippedStream(res, out);
	}

}
