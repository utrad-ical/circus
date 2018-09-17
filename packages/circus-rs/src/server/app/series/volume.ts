import koa from 'koa';
import compose from 'koa-compose';
import compress from 'koa-compress';
import { SeriesMiddlewareState } from './seriesRoutes';
import DicomVolume from '../../../common/DicomVolume';
import createPartialVolume from './createPartialVolume';

const PARTIAL_VOLUME_PRIORITY = 1;

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export default function volume(): koa.Middleware {
  return compose([
    compress(),
    async function volume(ctx, next): Promise<void> {
      const state = ctx.state as SeriesMiddlewareState;

      if (state.partialVolumeDescriptor) {
        const partialVolume: DicomVolume = await createPartialVolume(
          state.volumeAccessor,
          state.partialVolumeDescriptor,
          PARTIAL_VOLUME_PRIORITY
        );
        ctx.body = Buffer.from(partialVolume.data);
      } else {
        const { images, volume, load } = state.volumeAccessor;
        await load(images);
        ctx.body = Buffer.from(volume.data);
      }
    }
  ]);
}
