import type koa from 'koa';
import type { Counter } from '../../helper/createCounter.ts';

type MiddlewareOptions = {
  counter: Counter;
};

export default function countUp(options: MiddlewareOptions): koa.Middleware {
  const { counter } = options;
  return async function (
    ctx: koa.DefaultContext,
    next: koa.Next
  ): Promise<void> {
    const key = ctx.request.path.split('/').slice(-1)[0];
    counter.countUp(key);
    await next();
  };
}
