import Router from 'koa-router';
import seriesRoutes from '@utrad-ical/circus-rs/src/server/app/series/seriesRoutes';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import koa from 'koa';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import { FunctionService } from '@utrad-ical/circus-lib';
import { CircusRs } from './interface';
import ImageEncoder from '@utrad-ical/circus-rs/src/server/helper/image-encoder/ImageEncoder';

/**
 * Creates a series router.
 */
const createCircusRs: FunctionService<
  CircusRs,
  {
    apiLogger: Logger;
    volumeProvider: VolumeProvider;
    imageEncoder: ImageEncoder;
  }
> = async (options, { apiLogger, volumeProvider, imageEncoder }) => {
  const router = new Router();
  router.use(
    '/series/:sid',
    seriesRoutes({
      logger: apiLogger,
      volumeProvider,
      imageEncoder
    }) as any
  );
  return {
    routes: (router.routes() as any) as koa.Middleware,
    volumeProvider
  };
};

createCircusRs.dependencies = ['volumeProvider', 'apiLogger', 'imageEncoder'];

export default createCircusRs;

export const createRsRoutes: FunctionService<
  koa.Middleware,
  { rs: CircusRs }
> = async (options, { rs }) => {
  return rs.routes;
};

createRsRoutes.dependencies = ['rs'];

export const createVolumeProvider: FunctionService<
  VolumeProvider,
  { rs: CircusRs }
> = async (options, { rs }) => {
  return rs.volumeProvider;
};

createVolumeProvider.dependencies = ['rs'];
