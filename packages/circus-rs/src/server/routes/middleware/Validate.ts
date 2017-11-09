import * as koa from 'koa';
import StatusError from '../Error';
import { Validator, ValidatorRules } from '../../../common/Validator';

export default function validate(rules: ValidatorRules): koa.Middleware {
	return async function(ctx, next) {
		const origQuery = ctx.request.query;
		const validator = new Validator(rules);
		const { result, errors } = validator.validate(origQuery);
		if (errors.length) {
			throw StatusError.badRequest(errors.join('\n'));
		}
		ctx.state.query = result;
		await next();
	};
}
