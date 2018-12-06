import Router from 'koa-router';
import prepareHelperModules from '@utrad-ical/circus-rs/src/server/helper/prepareHelperModules';
import seriesRoutes from '@utrad-ical/circus-rs/src/server/app/series/seriesRoutes';

/**
 * Creates a series router.
 */
export default async function circusRs({ logger, dicomFileRepository }) {
  const helpers = await prepareHelperModules({
    dicomFileRepository: {
      module: dicomFileRepository
    },
    logger: {
      module: logger
    },
    imageEncoder: {
      module: 'PngJsImageEncoder',
      options: {}
    },
    cache: {
      memoryThreshold: 2147483648,
      maxAge: 3600
    }
  });

  const router = new Router();
  router.use('/series/:sid', seriesRoutes(helpers));
  return { rs: router.routes(), volumeProvider: helpers.volumeProvider };
}
