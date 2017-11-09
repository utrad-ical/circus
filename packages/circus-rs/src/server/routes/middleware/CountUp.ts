import { ServerHelpers } from '../../ServerHelpers';
import * as koa from 'koa';

export function countUp(helpers: ServerHelpers): koa.Middleware {
	const { counter } = helpers;
	return async function(ctx: koa.Context, next) {
		const key = ctx.request.path.split('/').slice(-1)[0];
		counter.countUp(key);
		await next();
	};
}
