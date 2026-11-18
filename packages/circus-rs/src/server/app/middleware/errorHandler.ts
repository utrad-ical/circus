import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Logger } from '@utrad-ical/circus-lib';
import type { RsEnv } from '../../types.ts';

export default function errorHandler(rsLogger: Logger): ErrorHandler<RsEnv> {
  return (error, ctx) => {
    rsLogger.error(error.message);
    if (error.stack) rsLogger.trace(error.stack);

    const status = error.status as ContentfulStatusCode | undefined;
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
