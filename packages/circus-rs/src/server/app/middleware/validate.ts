import type koa from 'koa';
import httpStatus from 'http-status';
import type { ValidatorRules } from '../../../common/Validator.ts';
import { Validator } from '../../../common/Validator.ts';

export default function validate(rules: ValidatorRules): koa.Middleware {
  return async function (
    ctx: koa.DefaultContext,
    next: koa.Next
  ): Promise<void> {
    const origQuery = ctx.request.query;
    const validator = new Validator(rules);
    const { result, errors } = validator.validate(origQuery);
    if (errors.length) {
      ctx.throw(httpStatus.BAD_REQUEST, errors.join('\n'));
    }
    ctx.state.query = result;
    await next();
  };
}
