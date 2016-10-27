import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';

import * as http from 'http';
import * as stream from 'stream';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export default class VolumeAction extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, this.isUID, null]
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
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
