/**
 * VolumeBasedController is a base class of controllers
 * which need DICOM volume (as RawData) specified by 'series' query parameter.
 */

import http = require('http');
import Controller from './Controller';
import DicomVolume from '../DicomVolume';
import logger from '../Logger';

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
		this.reader.get(series).then((vol: DicomVolume) => {
			try {
				this.processVolume(query, vol, res);
			} catch (e) {
				if ('stack' in e) logger.info(e.stack);
				this.respondInternalServerError(res, e.toString());
			}
		}).catch(err => {
			this.respondNotFound(res, 'Series not found');
		});
	}

	protected processVolume(query: any, vol: DicomVolume, res: http.ServerResponse): void {
		// Abstract.
		// In this method, "raw" is guaranteed to have valid image data.
	}
}