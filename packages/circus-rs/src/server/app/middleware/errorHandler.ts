import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Logger } from '@utrad-ical/circus-lib';
import type { RsEnv } from '../../types.ts';

export default function errorHandler(logger: Logger): ErrorHandler<RsEnv> {
  return (error, ctx) => {
    const status = error.status as ContentfulStatusCode | undefined;
    if (!status || status >= 500) {
      logger.error({ err: error, status: status ?? 500 }, 'RS request failed');
    }
    return ctx.json(
      {
        status: 'ng',
        message: status ? error.message : 'Internal server error.',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      status ?? 500
    );
  };
}
