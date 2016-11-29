import { ValidatorRules, Validator } from '../../common/Validator';
import * as express from 'express';
import { StatusError } from './Error';
import { isUID } from '../../common/ValidatorRules';
import DicomVolume from '../../common/DicomVolume';
import { ServerHelpers } from '../ServerHelpers';
import Logger from '../loggers/Logger';

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

/**
 * Global error handler which always output errors in JSON format
 * @param logger Logger to inject
 */
export function errorHandler(logger: Logger): express.ErrorRequestHandler {
	return function(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void {
		logger.error(err.message);
		if ('stack' in err) logger.trace(err.stack);

		// Unexpected error, probably due to bugs
		let status = 500;
		let message = 'Internal server error.';

		// Exceptions with status code, probably doe to invalid request, etc.
		if (typeof err.status === 'number') {
			status = err.status;
			message = err.message;
		}

		const out: any = { status: 'ng', message };
		if (process.env.NODE_ENV !== 'production' && 'stack' in err) {
			out.stack = err.stack;
		}

		res.status(status);
		res.json(out);
	};
}
