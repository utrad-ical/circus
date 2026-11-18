import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ValidatorRules } from '../../../common/Validator.ts';
import { Validator } from '../../../common/Validator.ts';
import type { RsEnv } from '../../types.ts';

export default function validate(
  rules: ValidatorRules
): MiddlewareHandler<RsEnv> {
  const validator = new Validator(rules);
  return async (ctx, next) => {
    const query = Object.fromEntries(
      Object.entries(ctx.req.queries()).map(([key, values]) => [
        key,
        values.length === 1 ? values[0] : values
      ])
    );
    const { result, errors } = validator.validate(query);
    if (errors.length) {
      throw new HTTPException(400, { message: errors.join('\n') });
    }
    ctx.set('rsQuery', result);
    await next();
  };
}
