import DicomVolume from '../../../common/DicomVolume';
import koa from 'koa';
import compose from 'koa-compose';
import compress from 'koa-compress';
import { ServerHelpers } from '../../ServerHelpers';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export default function volume(helpers: ServerHelpers): koa.Middleware {
  return compose([
    compress(),
    async function volume(ctx, next): Promise<void> {
      const vol = ctx.state.volume as DicomVolume;
      ctx.body = Buffer.from(vol.data);
    }
  ]);
}
