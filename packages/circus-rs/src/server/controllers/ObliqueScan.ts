/**
 * Oblique Image generator Action class
 */

import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';
import * as http from 'http';

export default class ObliqueScan extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, this.isUID, null],
			origin: ['Origin', null, this.isTuple(3), this.parseTuple(3)],
			u: ['Scan vector X', null, this.isTuple(3), this.parseTuple(3)],
			v: ['Scan vector Y', null, this.isTuple(3), this.parseTuple(3)],
			size: ['Output image size', null, this.isTuple(2), this.parseTuple(2, true)],
			ww: ['Window width', null, 'isFloat', 'toFloat'],
			wl: ['Window width', null, 'isFloat', 'toFloat']
		};
	}

	public processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		let { ww, wl, origin, u, v, size } = query;

		// Create the oblique image
		let buf = new Uint8Array(size[0] * size[1]);
		vol.scanOblique(origin, u, v, size, buf, ww, wl);

		this.respondGzippedArrayBuffer(res, buf);
	}

}
