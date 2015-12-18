import DicomVolume from '../DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../Validator';

import * as http from 'http';
import * as zlib from 'zlib';
import * as stream from 'stream';

/**
 * Controller class that dumps volume data.
 */
export default class VolumeAction extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, 'isLength:1:200', null]
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Content-Encoding', 'gzip');
		let gzip = zlib.createGzip();
		let z: number = 0;
		let zmax: number = vol.getDimension()[2];
		let out = new stream.Readable();
		out._read = function(size) {
			if (z >= zmax) {
				this.push(null); // ends stream
				return;
			}
			let slice = vol.getSingleImage(z);
			this.push(new Buffer(new Uint8Array(slice)));
			z++;
		};
		out.pipe(gzip).pipe(res);
	}
}
