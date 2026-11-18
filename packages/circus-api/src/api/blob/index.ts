import { httpError } from '../../middleware/errorHandler.ts';
import status from 'http-status';
import { createHash } from 'node:crypto';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

const maxUploadBytes = 20 * 1024 * 1024;

const sha1 = (buf: Buffer) => {
  const sha1 = createHash('sha1');
  sha1.update(buf);
  return sha1.digest('hex');
};

export const handleGet: RouteMiddleware<typeof routes.getBlobHash> = ({
  blobStorage
}) => {
  return async ctx => {
    const hash = ctx.req.param().hash;
    try {
      const file = await blobStorage.read(hash);
      return ctx.body(new Uint8Array(file), 200, {
        'Content-Type': 'application/octet-stream'
      });
    } catch (err) {
      throw httpError(status.NOT_FOUND);
    }
  };
};

export const handlePut: RouteMiddleware<typeof routes.putBlobHash> = ({
  blobStorage
}) => {
  return async ctx => {
    const body = ctx.req.raw.body;
    if (!body) throw httpError(status.BAD_REQUEST, 'Empty content was sent.');
    const gzip = /^(x-)?gzip$/.test(ctx.req.header('Content-Encoding') ?? '');
    const stream = gzip
      ? body.pipeThrough(new DecompressionStream('gzip'))
      : body;
    let bytes = 0;
    const limit = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > maxUploadBytes) {
          throw httpError(
            status.REQUEST_ENTITY_TOO_LARGE,
            'request entity too large'
          );
        }
        controller.enqueue(chunk);
      }
    });
    const file = Buffer.from(
      await new Response(stream.pipeThrough(limit)).arrayBuffer()
    );
    const hash = ctx.req.param().hash;
    if (file.length === 0) {
      throw httpError(status.BAD_REQUEST, 'Empty content was sent.');
    }
    if (sha1(file) !== hash) {
      throw httpError(status.BAD_REQUEST, 'Hash mismatch.');
    }
    await blobStorage.write(hash, file);
    return ctx.body(null, 201);
  };
};
