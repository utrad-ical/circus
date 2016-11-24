import { ValidatorRules, Validator } from '../../common/Validator';
import * as express from 'express';
import { StatusError } from './Error';

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

