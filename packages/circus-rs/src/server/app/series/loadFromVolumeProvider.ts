import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { RsEnv } from '../../types.ts';
import type { Logger } from '@utrad-ical/circus-lib';
import type PartialVolumeDescriptor from '../../../volume/PartialVolumeDescriptor.ts';
import { isDicomUid } from '@utrad-ical/circus-lib';
import { isValidPartialVolumeDescriptor } from '../../../volume/PartialVolumeDescriptor.ts';

import type {
  VolumeProvider,
  VolumeAccessor
} from '../../helper/createVolumeProvider.ts';
import validate from '../middleware/validate.ts';
import type { ValidatorRules } from '../../../common/Validator.ts';
import * as mr from 'multi-integer-range';

interface LoadStoreOptions {
  logger: Logger;
  volumeProvider: VolumeProvider;
}

/**
 * Creates a middleware that injects `VolumeAccessor` to the request context.
 * A VolumeAccessor is bound to a specific series UID
 * provided via the request URL.
 */
export default function loadVolumeProvider({
  logger,
  volumeProvider
}: LoadStoreOptions): [MiddlewareHandler<RsEnv>, MiddlewareHandler<RsEnv>] {
  const rules: ValidatorRules = {
    start: ['Start image no', undefined, 'isInt', 'toInt'],
    end: ['End image no', undefined, 'isInt', 'toInt'],
    delta: ['delta', undefined, 'isInt', 'toInt']
  };

  const main: MiddlewareHandler<RsEnv> = async (ctx, next) => {
    const series = ctx.req.param('sid');
    if (!series || !isDicomUid(series)) {
      throw new HTTPException(400, {
        message: 'Invalid series UID'
      });
    }

    let volumeAccessor: VolumeAccessor | undefined = undefined;
    try {
      volumeAccessor = await volumeProvider(series);
    } catch (err) {
      const requestLogger = ctx.var.requestLogger ?? logger;
      requestLogger.error({ err }, 'Failed to load RS volume');
      throw new HTTPException(404, {
        message: 'Series could not be loaded'
      });
    }

    let partialVolumeDescriptor: PartialVolumeDescriptor | undefined;
    const { images } = volumeAccessor;
    const { start, end, delta } = ctx.var.rsQuery;
    if (start !== undefined || end !== undefined || delta !== undefined) {
      if (
        !isValidPartialVolumeDescriptor({ start, end, delta }) ||
        !mr.has(images, mr.normalize(start)) ||
        !mr.has(images, mr.normalize(end))
      ) {
        throw new HTTPException(400, {
          message: 'Volume descriptor is invalid'
        });
      }
      partialVolumeDescriptor = { start, end, delta };
    }

    ctx.set('partialVolumeDescriptor', partialVolumeDescriptor);
    ctx.set('volumeAccessor', volumeAccessor);
    await next();
  };

  return [validate(rules), main];
}
