import { ValidatorRules, Validator } from '../../common/Validator';
import * as express from 'express';
import { StatusError } from './Error';
import Logger from '../loggers/Logger';
import { isUID } from '../../common/ValidatorRules';
import DicomVolume from '../../common/DicomVolume';
import AsyncLruCache from '../../common/AsyncLruCache';
import ImageEncoder from '../image-encoders/ImageEncoder';

export function validate(rules: ValidatorRules): express.Handler {
	return function(req, res, next): void {
		const origQuery = req.query;
		const validator = new Validator(rules);
		const { result, errors } = validator.validate(origQuery);
		if (errors.length) {
			next(StatusError.badRequest(errors.join('\n')));
			return;
		}
		try {
			req.query = result;
			next();
		} catch (e) {
			next(e);
		}
	};
}

export function loadSeries(
	logger: Logger, reader: AsyncLruCache<DicomVolume>, imageEncoder: ImageEncoder
): express.Handler {
	return function(req, res, next): void {
		if (!isUID(req.params.sid)) {
			throw StatusError.badRequest('Invalid series UID');
		}
		const series = req.params.sid;

		// TODO: Specifying image range is temporarily disabled
		reader.get(series).then((vol: DicomVolume) => {
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
