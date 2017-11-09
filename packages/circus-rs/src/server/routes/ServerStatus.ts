import * as koa from 'koa';
import { ServerHelpers } from '../ServerHelpers';

const startUpTime: Date = new Date(); // The time this module was loaded

export default function serverStatus(helpers: ServerHelpers): koa.Middleware {
	return async function serverStatus(ctx, next) {
		const { seriesReader, counter } = helpers;
		const status = {
			status: 'Running',
			seriesReader: {
				count: seriesReader.length,
				size: seriesReader.getTotalSize()
			},
			process: {
				memoryUsage: process.memoryUsage(),
				upTime: process.uptime(),
				upSince: startUpTime.toISOString()
			},
			counter: counter.getCounts(),
			loadedModules: ctx.state.locals.loadedModuleNames,
			authorization: { enabled: ctx.state.locals.authorizationEnabled }
		};
		ctx.body = status;
	};
}
