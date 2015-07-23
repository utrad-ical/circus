/**
 * Show server status.
 */
var url = require('url');

import DicomServerModule = require('./DicomServerModule');
import http = require('http');
import Counter = require('../Counter');

import logger = require('../Logger');

export = ServerStatus;

var startUpTime: Date = new Date(); // The time this module was loaded

class ServerStatus extends DicomServerModule {

	public process(req: http.ServerRequest, res: http.ServerResponse): void
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
