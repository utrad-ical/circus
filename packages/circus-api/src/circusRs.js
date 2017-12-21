import { createSeriesRouter } from '@utrad-ical/circus-rs/src/server/Server';
import createDicomReader from '@utrad-ical/circus-rs/src/server/createDicomReader';
import PngJsImageEncoder from '@utrad-ical/circus-rs/src/server/image-encoders/PngJsImageEncoder';
import PureJsDicomDumper from '@utrad-ical/circus-rs/src/server/dicom-dumpers/PureJsDicomDumper';
import loadSeries from '@utrad-ical/circus-rs/src/server/routes/middleware/LoadSeries';
import { multirange } from 'multi-integer-range';
import Router from 'koa-router';

/**
 * Creates a series router.
 */
export default function circusRs({ models, logger }, dicomStorage) {
  const dicomFileRepository = {
    getSeriesLoader: async seriesUid => {
      const series = await models.series.findByIdOrFail(seriesUid);
      const images = multirange(series.images);
      if (images.min() !== 1 || images.segmentLength() !== 1) {
        throw new Error('Incontinuous series not supported');
      }
      return {
        seriesLoader: async image => {
          const key = `${seriesUid}/${image}`;
          const file = await dicomStorage.read(key);
          return file;
        },
        count: images.length()
      };
    }
  };

  const dicomDumper = new PureJsDicomDumper();
  const seriesReader = new createDicomReader(
    dicomFileRepository,
    dicomDumper,
    2 * 1024 * 1024 * 1024
  );

  const imageEncoder = new PngJsImageEncoder();

  const helpers = {
    logger,
    seriesReader,
    imageEncoder
  };

  const volumeLoader = loadSeries(helpers);

  const router = new Router();
  router.use('/series/:sid', volumeLoader);
  router.use('/series/:sid', createSeriesRouter(helpers).routes());

  return router;
}
