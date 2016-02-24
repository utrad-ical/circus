/**
 * Show server status.
 */
import Controller from './Controller';
import * as http from 'http';
import Counter from '../Counter';
import Server = require('../Server');

let config: Configuration = require('config');

let startUpTime: Date = new Date(); // The time this module was loaded

export default class ServerStatus extends Controller {

	public server: Server;

	protected needsTokenAutorhization(): boolean {
		return false;
	}

	public process(query: http.ServerRequest, res: http.ServerResponse): void {
		let status = {
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
			counter: this.server.counter.getCounts(),
			loadedModules: this.server.loadeModuleNames,
			authorization: {enabled: !!config.authorization.require}
		};
		this.respondJson(res, status);
	}

}
