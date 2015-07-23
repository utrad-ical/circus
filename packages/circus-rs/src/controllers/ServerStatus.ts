/**
 * Show server status.
 */
var url = require('url');

import Controller from './Controller';
import http = require('http');
import Counter from '../Counter';

import logger from '../Logger';

var startUpTime: Date = new Date(); // The time this module was loaded

export default class ServerStatus extends Controller {

	public process(query: any, res: http.ServerResponse): void
	{
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-type', 'application/json');
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
		res.end(JSON.stringify(status, null, '  '));
	}

}
