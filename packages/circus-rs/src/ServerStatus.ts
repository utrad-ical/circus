/**
 * Show server status.
 */
var url = require('url');

import DicomServerModule = require('./DicomServerModule');
import DicomReader = require('./DicomReader');
import http = require('http');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = ServerStatus;

class ServerStatus extends DicomServerModule {

	public process(req: http.ServerRequest, res: http.ServerResponse, reader: DicomReader): void
	{
		res.setHeader('Content-type', 'application/json');
		var status = {
			status: 'Running',
			dicomReader: {
				count: reader.length()
			},
			process: {
				memoryUsage: process.memoryUsage()
			}
		};
		res.write(JSON.stringify(status, null, '  '));
	}

}
