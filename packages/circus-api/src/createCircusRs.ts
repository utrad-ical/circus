import Router from 'koa-router';
import prepareHelperModules from '@utrad-ical/circus-rs/src/server/helper/prepareHelperModules';
import seriesRoutes from '@utrad-ical/circus-rs/src/server/app/series/seriesRoutes';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import koa from 'koa';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import { FunctionService } from '@utrad-ical/circus-lib';
import { CircusRs } from './interface';

/**
 * Creates a series router.
 */
const createCircusRs: FunctionService<
  CircusRs,
  {
    apiLogger: Logger;
    dicomFileRepository: DicomFileRepository;
  }
> = async (options, { apiLogger, dicomFileRepository }) => {
  const helpers = await prepareHelperModules({
    dicomFileRepository: { module: dicomFileRepository },
    logger: { module: apiLogger },
    imageEncoder: {
      module: 'PngJsImageEncoder',
      options: {}
    },
    cache: {
      memoryThreshold: 2147483648,
      maxAge: 3600
    }
  } as any);

  const router = new Router();
  router.use('/series/:sid', seriesRoutes(helpers as any));
  return {
    routes: router.routes() as koa.Middleware,
    volumeProvider: helpers.volumeProvider as VolumeProvider
  };
};

createCircusRs.dependencies = ['apiLogger', 'dicomFileRepository'];

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
