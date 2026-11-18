import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { validator as honoValidator } from 'hono/validator';
import type { z } from 'zod';
import type { Validator } from '../interface.ts';
import type {
  ApiEnv,
  CircusContext,
  CircusMiddleware
} from '../typings/middlewares.ts';
import { httpError } from './errorHandler.ts';

export const contentType = (ctx: CircusContext) =>
  ctx.req.header('Content-Type')?.split(';', 1)[0].trim().toLowerCase();

const badJson = (message: string) =>
  httpError(400, 'Invalid JSON as request body.\n' + message);

const limitJson = bodyLimit({
  maxSize: 1024 * 1024,
  onError: () => {
    throw badJson('request entity too large');
  }
});

const jsonTypes = new Set([
  'application/json',
  'application/json-patch+json',
  'application/vnd.api+json',
  'application/csp-report'
]);

export const readJsonBody: CircusMiddleware = async (ctx, next) => {
  const type = contentType(ctx);
  const { raw } = ctx.req;
  if (!type || !jsonTypes.has(type) || !raw.body) {
    await next();
    return;
  }

  const encoding = raw.headers.get('Content-Encoding') || 'identity';
  const headers = new Headers(raw.headers);
  let body = raw.body;
  if (encoding !== 'identity') {
    if (encoding !== 'gzip' && encoding !== 'deflate') {
      throw badJson('Unsupported Content-Encoding: ' + encoding);
    }
    headers.delete('Content-Length');
    body = body.pipeThrough(new DecompressionStream(encoding));
  }
  if (!headers.has('Content-Length') || headers.has('Transfer-Encoding')) {
    // Hono's body limiter reconstructs a Request for streamed input.
    const init = {
      method: raw.method,
      headers,
      body,
      signal: raw.signal,
      duplex: 'half' as const
    };
    ctx.req.raw = new Request(raw.url, init);
  }

  try {
    await limitJson(ctx, async () => {
      const text = await ctx.req.text();
      if (!text) return;
      if (!/^[ \t\n\r]*[[{]/.test(text)) {
        throw new SyntaxError('invalid JSON, only supports object and array');
      }
      ctx.set('jsonBody', JSON.parse(text));
    });
  } catch (error) {
    if (error instanceof Error && !(error instanceof HTTPException)) {
      throw badJson(error.message);
    }
    throw error;
  }
  await next();
};

const validate = async (
  validator: Validator,
  schema: z.ZodType,
  data: unknown,
  phase: 'request' | 'response'
) => {
  try {
    return await validator.validate(
      schema,
      data,
      phase === 'request' ? 'decode' : 'encode'
    );
  } catch (error) {
    if (error instanceof Error) Object.assign(error, { phase });
    throw error;
  }
};

export const validateRequest = <S extends z.ZodType>(
  validator: Validator,
  schema: S
) => {
  const decode = (value: unknown) =>
    validate(validator, schema, value, 'request');
  const middleware = honoValidator('json', decode);
  return createMiddleware<ApiEnv, string, { out: { json: z.output<S> } }>(
    async (ctx, next) => {
      if (
        contentType(ctx) === 'application/json' &&
        ctx.var.jsonBody !== undefined
      ) {
        return middleware(ctx, next);
      }
      ctx.req.addValidatedData('json', await decode(ctx.var.jsonBody ?? {}));
      await next();
    }
  );
};

export const respondJson = async (
  ctx: CircusContext,
  validator: Validator,
  schema: z.ZodType | undefined,
  value: unknown,
  status?: number
): Promise<Response> => {
  const body = schema
    ? await validate(validator, schema, value, 'response')
    : value;
  const code = status as ContentfulStatusCode | undefined;
  if (body == null) return ctx.body(null, code ?? 204);
  if (typeof body === 'string') return ctx.text(body, code);
  return ctx.json(body, code);
};
