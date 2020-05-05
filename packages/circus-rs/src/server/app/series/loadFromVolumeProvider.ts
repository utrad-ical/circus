import koa from 'koa';
import httpStatus from 'http-status';
import {
  isDicomUid,
  Logger,
  PartialVolumeDescriptor
} from '@utrad-ical/circus-lib';

import {
  VolumeProvider,
  VolumeAccessor
} from '../../helper/createVolumeProvider';
import compose from 'koa-compose';
import validate from '../middleware/validate';
import { ValidatorRules } from '../../../common/Validator';
import { SeriesMiddlewareState } from './createSeriesRoutes';
import { MultiRange } from 'multi-integer-range';

interface LoadStoreOptions {
  logger: Logger;
  volumeProvider: VolumeProvider;
}

/**
 * Creates a middleware that injects `VolumeAccessor` to Koa's context.
 * A VolumeAccessor is bound to a specific series UID
 * provided via the request URL.
 */
export default function loadVolumeProvider({
  logger,
  volumeProvider
}: LoadStoreOptions): koa.Middleware {
  const rules: ValidatorRules = {
    start: ['Start image no', undefined, 'isInt', 'toInt'],
    end: ['End image no', undefined, 'isInt', 'toInt'],
    delta: ['delta', undefined, 'isInt', 'toInt']
  };

  const main: koa.Middleware = async function (
    ctx: koa.DefaultContext,
    next: koa.Next
  ): Promise<void> {
    const series = ctx.params.sid;
    if (!isDicomUid(series)) {
      ctx.throw(httpStatus.BAD_REQUEST, 'Invalid series UID');
    }

    let volumeAccessor: VolumeAccessor | undefined = undefined;
    try {
      volumeAccessor = await volumeProvider(series);
    } catch (err) {
      logger.error(err);
      ctx.throw(httpStatus.NOT_FOUND, 'Series could not be loaded');
    }

    let partialVolumeDescriptor:
      | PartialVolumeDescriptor
      | undefined = undefined;
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

      partialVolumeDescriptor = { start, end, delta };
    }

    (ctx.state as SeriesMiddlewareState) = {
      ...ctx.state,
      partialVolumeDescriptor,
      volumeAccessor
    };
    await next();
  };

  return compose([validate(rules), main]);
}
