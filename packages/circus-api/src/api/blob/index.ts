import status from 'http-status';
import rawBody from 'raw-body';
import { createHash } from 'crypto';
import { RouteMiddleware } from '../../typings/middlewares';

const sha1 = (buf: Buffer) => {
  const sha1 = createHash('sha1');
  sha1.update(buf);
  return sha1.digest('hex');
};

export const handleGet: RouteMiddleware = ({ blobStorage }) => {
  return async (ctx, next) => {
    const hash = ctx.params.hash;
    try {
      const file = await blobStorage.read(hash);
      ctx.type = 'application/octet-stream';
      ctx.body = file;
    } catch (err) {
      ctx.throw(status.NOT_FOUND);
    }
  };
};

export const handlePut: RouteMiddleware = ({ blobStorage }) => {
  return async (ctx, next) => {
    const file = await rawBody(ctx.req, { limit: '2mb' });
    const hash = ctx.params.hash;
    if (file.length === 0) {
      ctx.throw(status.BAD_REQUEST, 'Empty content was sent.');
    }
    if (sha1(file) !== hash) {
      ctx.throw(status.BAD_REQUEST, 'Hash mismatch.');
    }
    await blobStorage.write(hash, file);
    ctx.body = null;
    ctx.status = status.OK;
  };
};
