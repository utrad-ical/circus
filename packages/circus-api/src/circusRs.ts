import Router from 'koa-router';
import prepareHelperModules from '@utrad-ical/circus-rs/src/server/helper/prepareHelperModules';
import seriesRoutes from '@utrad-ical/circus-rs/src/server/app/series/seriesRoutes';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import koa from 'koa';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';

/**
 * Creates a series router.
 */
const circusRs = async ({
  logger,
  dicomFileRepository
}: {
  logger: Logger;
  dicomFileRepository: DicomFileRepository;
}) => {
  const helpers = await prepareHelperModules({
    dicomFileRepository: { module: dicomFileRepository },
    logger: { module: logger },
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
    rs: router.routes() as koa.Middleware,
    volumeProvider: helpers.volumeProvider as VolumeProvider
  };
};

export default circusRs;
