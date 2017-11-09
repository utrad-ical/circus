import DicomVolume from '../../../common/DicomVolume';
import * as koa from 'koa';
import * as compose from 'koa-compose';
import * as compress from 'koa-compress';
import { ServerHelpers } from '../../ServerHelpers';

/**
 * Handles 'volume' endpoint which dumps the whole voxel data of the
 * specified series.
 */
export default function volume(helpers: ServerHelpers): koa.Middleware {
	return compose([
		compress(),
		async function volume(ctx, next) {
			const vol = ctx.state.volume as DicomVolume;
			ctx.body = Buffer.from(vol.data);
		}
	]);
}
