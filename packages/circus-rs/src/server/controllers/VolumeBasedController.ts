import * as express from 'express';
import Controller from './Controller';
import DicomVolume from '../../common/DicomVolume';

/**
 * VolumeBasedController is a base class of controllers
 * which need DICOM volume (as DicomVolume) specified by the 'series' query parameter.
 */
export default class VolumeBasedController extends Controller {
	protected process(req: express.Request, res: express.Response): void {
		if (!this.isUID(req.params.sid)) {
			this.respondBadRequest(res, 'Invalid series UID');
			return;
		}
		const series = req.params.sid;

		// TODO: Specifying image range is temporarily disabled
		this.reader.get(series).then((vol: DicomVolume) => {
			try {
				this.processVolume(req, vol, res);
			} catch (e) {
				if ('stack' in e) this.logger.info(e.stack);
				this.respondInternalServerError(res, e.toString());
			}
		}).catch(err => {
			this.respondNotFound(res, 'Error while loading a series');
			this.logger.error(err.toString());
		});
	}

	protected processVolume(
		req: express.Request, vol: DicomVolume, res: express.Response
	): void {
		// Abstract.
		// In this method, `vol` is guaranteed to have valid image data.
	}
}
