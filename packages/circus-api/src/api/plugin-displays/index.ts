import { RouteMiddleware } from '../../typings/middlewares';
import path from 'path';
import fs from 'fs-extra';
import httpStatus from 'http-status';

const root = path.join(__dirname, '../../../store/displays');

export const handleGet: RouteMiddleware = () => {
  return async (ctx, next) => {
    const filePath = path.join(root, ctx.params.path);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      ctx.type = 'text/javascript';
      ctx.body = content;
    } catch (err) {
      if (err.code === 'ENOENT')
        ctx.throw(httpStatus.NOT_FOUND, 'The requested display was not found.');
      else throw err;
    }
  };
};
