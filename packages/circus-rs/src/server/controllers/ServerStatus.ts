import Controller from './Controller';
import * as express from 'express';

const startUpTime: Date = new Date(); // The time this module was loaded

/**
 * Handles 'status' endpoint which returns various server status information.
 */
export default class ServerStatus extends Controller {

	protected needsTokenAutorhization(): boolean {
		return false;
	}

	public process(query: express.Request, req: express.Request, res: express.Response): void {
		const status = {
			status: 'Running',
			dicomReader: {
				count: this.reader.length,
				size: this.reader.getTotalSize()
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
		this.respondJson(res, status);
	}

}
