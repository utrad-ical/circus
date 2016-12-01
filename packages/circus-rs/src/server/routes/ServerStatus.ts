import * as express from 'express';
import { ServerHelpers } from '../ServerHelpers';

const startUpTime: Date = new Date(); // The time this module was loaded

export function execute(helpers: ServerHelpers): express.RequestHandler {
	return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
		const { seriesReader } = helpers;
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
			counter: req.app.locals.counter.getCounts(),
			loadedModules: req.app.locals.loadedModuleNames,
			authorization: { enabled: req.app.locals.authorizationEnabled }
		};
		res.json(status);
	};
}
