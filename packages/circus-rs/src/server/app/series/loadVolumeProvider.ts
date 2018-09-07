import koa from 'koa';
import httpStatus from 'http-status';
import { isUID } from '../../../common/ValidatorRules';
import Logger from '../../helper/logger/Logger';
import {
  VolumeProvider,
  VolumeAccessor
} from '../../helper/createVolumeProvider';
import compose from 'koa-compose';
import validate from '../middleware/validate';
import { ValidatorRules } from '../../../common/Validator';
import { SeriesMiddlewareState, SubVolumeDescriptor } from './seriesRoutes';
import { MultiRange } from 'multi-integer-range';

interface loadStoreOptions {
  logger: Logger;
  volumeProvider: VolumeProvider;
}
export default function loadVolumeProvider({
  logger,
  volumeProvider
}: loadStoreOptions): koa.Middleware {
  const rules: ValidatorRules = {
    start: ['Start image no', undefined, 'isInt', 'toInt'],
    end: ['End image no', undefined, 'isInt', 'toInt'],
    delta: ['delta', undefined, 'isInt', 'toInt']
  };

  const main: koa.Middleware = async function(ctx, next): Promise<void> {
    const series = ctx.params.sid;
    if (!isUID(series)) {
      ctx.throw(httpStatus.BAD_REQUEST, 'Invalid series UID');
    }

    let volumeAccessor: VolumeAccessor | undefined = undefined;
    try {
      volumeAccessor = await volumeProvider(series);
    } catch (err) {
      logger.error(err);
      console.error(err);
      ctx.throw(httpStatus.NOT_FOUND, 'Series could not be loaded');
    }

    let subVolumeDescriptor: SubVolumeDescriptor | undefined = undefined;
    const { images } = volumeAccessor!;
    const { start, end, delta = 1 } = ctx.state.query;
    if (start !== undefined || end !== undefined) {
      const imageRange = new MultiRange(images);

      // Check if the descriptor is valid.
      if (
        start === undefined ||
        end === undefined ||
        !imageRange.has(start) ||
        !imageRange.has(end)
      )
        ctx.throw(httpStatus.BAD_REQUEST, 'Volume descriptor is invalid');

      subVolumeDescriptor = { start, end, delta };
    }

    (ctx.state as SeriesMiddlewareState) = {
      ...ctx.state,
      subVolumeDescriptor,
      volumeAccessor
    };
    await next();
  };

  return compose([validate(rules), main]);
}
