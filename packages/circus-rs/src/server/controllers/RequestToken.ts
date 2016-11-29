import * as express from 'express';
import { isUID } from '../../common/ValidatorRules';
import { generateAccessToken } from '../auth/GenerateToken';
import { StatusError } from './Error';
import { validate } from './Middleware';
import Logger from '../loggers/Logger';
import AsyncLruCache from '../../common/AsyncLruCache';
import DicomVolume from '../../common/DicomVolume';
import ImageEncoder from '../image-encoders/ImageEncoder';

/**
 * Handles 'requestToken' endpoint which returns an access token
 * for each authorized series.
 */
export function execute(
	logger: Logger, reader: AsyncLruCache<DicomVolume>, imageEncoder: ImageEncoder
): express.RequestHandler[] {

	const validator = validate({ series: ['Series UID', null, isUID, null] });

	const main = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
		const series: string = req.query.series;

		generateAccessToken().then(token => {
			req.app.locals.authorizationCache.update(series, token);
			const status = { result: 'OK', token };
			res.json(status);
			res.end();
		}).catch(() => {
			next(StatusError.internalServerError('Internal server error occurred while generating access token'));
		});

	};

	return [validator, main];

}
