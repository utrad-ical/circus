import { STATUS_CODES } from 'node:http';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Logger } from '@utrad-ical/circus-lib';
import { ValidationError } from '../createValidator.ts';

interface Options {
  includeErrorDetails: boolean;
  logger: Logger;
  method: string;
  route: string | null;
}

export const httpError = (
  status: number,
  message: string | Error = STATUS_CODES[status] ?? 'HTTP error',
  headers?: HeadersInit
) =>
  Object.assign(
    new HTTPException(status as ContentfulStatusCode, {
      message: typeof message === 'string' ? message : message.message,
      ...(headers && { res: new Response(null, { headers }) })
    }),
    { expose: status < 500 }
  );

export const formatError = (
  error: unknown,
  { includeErrorDetails, logger, method, route }: Options
) => {
  if (error instanceof ValidationError) {
    if (error.phase === 'request') {
      return {
        status: 400 as const,
        body: {
          error: 'Validation failed.',
          issues: error.issues.map(({ path, message }) => ({ path, message }))
        }
      };
    }
    const message =
      error.phase === 'response'
        ? 'Response schema validation error detected.'
        : 'Unexpected validation error.';
    logger.error(
      {
        method,
        route,
        phase: error.phase,
        issueCodes: error.issues.map(({ code }) => code)
      },
      message
    );
    return { status: 500 as const, body: { error: message } };
  }

  const { status, message, stack } =
    error instanceof Error
      ? (error as Error & { status?: ContentfulStatusCode })
      : { status: undefined, message: String(error), stack: undefined };
  if (status) {
    if (status >= 500) {
      logger.error({ err: error, method, route, status }, 'HTTP error');
    }
    return {
      status,
      body: { error: message },
      headers: error instanceof HTTPException ? error.res?.headers : undefined
    };
  }

  logger.error({ err: error, method, route }, 'Unexpected request error');
  return {
    status: 500 as const,
    body: includeErrorDetails
      ? { error: message, stack }
      : { error: 'Internal server error.' }
  };
};
