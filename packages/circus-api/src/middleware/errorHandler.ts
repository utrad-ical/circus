import { STATUS_CODES } from 'node:http';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Logger } from '@utrad-ical/circus-lib';
import { ValidationError } from '../createValidator.ts';

interface Options {
  includeErrorDetails: boolean;
  logger: Logger;
  route?: string;
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
  { includeErrorDetails, logger, route }: Options
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
    logger.error(message, {
      route,
      phase: error.phase,
      issueCodes: error.issues.map(({ code }) => code)
    });
    return { status: 500 as const, body: { error: message } };
  }

  const { status, message, stack } =
    error instanceof Error
      ? (error as Error & { status?: ContentfulStatusCode })
      : { status: undefined, message: String(error), stack: undefined };
  if (status) {
    logger.info('HTTP error with status ' + status);
    logger.info(error);
    return {
      status,
      body: { error: message },
      headers: error instanceof HTTPException ? error.res?.headers : undefined
    };
  }

  logger.error(error);
  return {
    status: 500 as const,
    body: includeErrorDetails
      ? { error: message, stack }
      : { error: 'Internal server error.' }
  };
};
