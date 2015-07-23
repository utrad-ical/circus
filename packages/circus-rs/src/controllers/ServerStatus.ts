/**
 * Show server status.
 */
import Controller from './Controller';
import http = require('http');
import Counter from '../Counter';

var startUpTime: Date = new Date(); // The time this module was loaded

export default class ServerStatus extends Controller {

	public process(query: any, res: http.ServerResponse): void
	{
		var status = {
			status: 'Running',
			dicomReader: {
				count: this.reader.length()
			},
			process: {
				memoryUsage: process.memoryUsage(),
				upTime: process.uptime(),
				upSince: startUpTime.toISOString()
			},
			counter: Counter.getCounts()
		};
		this.respondJson(res, status);
	}

}
