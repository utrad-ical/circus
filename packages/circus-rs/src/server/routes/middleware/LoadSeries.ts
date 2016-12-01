import * as express from 'express';
import { StatusError } from '../Error';
import { ServerHelpers } from '../../ServerHelpers';
import { isUID } from '../../../common/ValidatorRules';
import DicomVolume from '../../../common/DicomVolume';

export function loadSeries(helpers: ServerHelpers): express.Handler {
	const { seriesReader, logger } = helpers;
	return function(req, res, next): void {
		if (!isUID(req.params.sid)) {
			throw StatusError.badRequest('Invalid series UID');
		}
		const series = req.params.sid;

		// TODO: Specifying image range is temporarily disabled
		seriesReader.get(series).then((vol: DicomVolume) => {
			try {
				(req as any).volume = vol;
				next();
			} catch (e) {
				next(StatusError.internalServerError(e.toString()));
			}
		}).catch(err => {
			logger.error(err);
			next(StatusError.notFound('Series could not be loaded'));
		});
	};
}
