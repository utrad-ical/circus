import { ServerHelpers } from '../../ServerHelpers';
import koa from 'koa';

export default function countUp(helpers: ServerHelpers): koa.Middleware {
  const { counter } = helpers;
  return async function(ctx: koa.Context, next): Promise<void> {
    const key = ctx.request.path.split('/').slice(-1)[0];
    counter.countUp(key);
    await next();
  };
}
