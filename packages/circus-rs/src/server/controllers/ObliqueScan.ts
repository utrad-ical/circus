import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';
import { Section } from '../../common/geometry/Section';
import * as http from 'http';

/**
 * Handles 'scan' endpoint which returns MPR image for
 * an arbitrary orientation.
 */
export default class ObliqueScan extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, this.isUID, null],
			'origin!': ['Origin', null, this.isTuple(3), this.parseTuple(3)],
			'xAxis!': ['Scan vector X', null, this.isTuple(3), this.parseTuple(3)],
			'yAxis!': ['Scan vector Y', null, this.isTuple(3), this.parseTuple(3)],
			'size!': ['Output image size', null, this.isTuple(2), this.parseTuple(2, true)],
			ww: ['Window width', undefined, 'isFloat', 'toFloat'],
			wl: ['Window width', undefined, 'isFloat', 'toFloat'],
			format: ['Output type', 'arraybuffer', (s) => s === 'png', () => 'png']
		};
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		const { ww, wl, origin, xAxis, yAxis, size, format } = query;

		const useWindow = (typeof ww === 'number' && typeof wl === 'number');
		if (format === 'png' && !useWindow) {
			this.respondBadRequest(res, 'Window values are required for PNG output.');
			return;
		}

		// Create the oblique image
		let buf: Uint8Array; // or similar
		if (useWindow) {
			buf = new Uint8Array(size[0] * size[1]);
		} else {
			buf = new (vol.getPixelFormatInfo().arrayClass)(size[0] * size[1]);
		}
		const section: Section = { origin, xAxis, yAxis };
		vol.scanObliqueSection(section, size, buf, ww, wl);

		// Output
		if (format === 'png') {
			this.respondImage(res, new Buffer(buf), size[0], size[1]);
		} else {
			this.respondGzippedArrayBuffer(res, buf);
		}
	}

}
