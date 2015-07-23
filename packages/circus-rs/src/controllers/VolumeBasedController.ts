/**
 * VolumeBasedController is a base class of controllers
 * which need DICOM volume (as RawData) specified by 'series' query parameter.
 */

import http = require('http');
import Controller from './Controller';
import RawData from '../RawData';

export default class VolumeBasedController extends Controller {
	protected process(query: any, res: http.ServerResponse): void {
		var series: string = null;
		if ('series' in query) {
			series = query['series'];
		}
		if (!series) {
			this.respondBadRequest(res, 'No series in query');
			return;
		}
		// TODO: Specifying image range is temporarily disabled
		this.reader.readData(series, 'all', (raw: RawData, error: string) => {
			if (error || !raw) {
				this.respondNotFound(res, 'Series not found');
				return;
			}
			try {
				this.processVolume(query, raw, res);
			} catch (e) {
				this.respondInternalServerError(res, e.toString());
			}
		});
	}

	protected processVolume(query: any, raw: RawData, res: http.ServerResponse): void {
		// Abstract.
		// In this method, "raw" is guaranteed to have valid image data.
	}
}