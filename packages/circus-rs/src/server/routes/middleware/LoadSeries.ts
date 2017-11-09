import * as koa from 'koa';
import StatusError from '../Error';
import { ServerHelpers } from '../../ServerHelpers';
import { isUID } from '../../../common/ValidatorRules';
import DicomVolume from '../../../common/DicomVolume';

export default function loadSeries(helpers: ServerHelpers): koa.Middleware {
	const { seriesReader, logger } = helpers;
	return async function(ctx, next) {
		const req = ctx.request;
		const series = ctx.params.sid;
		if (!isUID(series)) {
			throw StatusError.badRequest('Invalid series UID');
		}

		// TODO: Specifying image range is temporarily disabled
		let vol;
		try {
			vol = await seriesReader.get(series);
		} catch (err) {
			logger.error(err);
			throw StatusError.notFound('Series could not be loaded');
		}
		ctx.state.volume = vol;
		await next();
	};
}
