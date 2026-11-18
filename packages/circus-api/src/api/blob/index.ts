import { httpError } from '../../middleware/errorHandler.ts';
import status from 'http-status';
import rawBody from 'raw-body';
import { createHash } from 'crypto';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';
import { createGunzip } from 'zlib';

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
    const incoming = /^(x-)?gzip$/.test(
      ctx.env.incoming.headers['content-encoding'] ?? ''
    )
      ? ctx.env.incoming.pipe(createGunzip())
      : ctx.env.incoming;
    const file = await rawBody(incoming, { limit: '20mb' });
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
