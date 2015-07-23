/**
 * MPR Image generator class
 */
var url = require('url');

import RawData = require('./RawData');
import DicomReader = require('./DicomReader');
import DicomRawDumper = require('./DicomRawDumper');
import DicomServerModule = require('./controllers/DicomServerModule');

import http = require('http');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

var config = require('config');

export = RawAction;

class RawAction extends DicomServerModule {

	rawDumper: DicomRawDumper;

	protected initialize() {
		super.initialize();
		var rawDumperModule = require('./' + config.rawDumper.module);
		this.rawDumper = new rawDumperModule(config);
	}

	public process(req: http.ServerRequest, res: http.ServerResponse, reader: DicomReader): void
	{
		var u = url.parse(req.url, true);
		var query = u.query;

		var series = '';
		if ('series' in query) {
			series = query['series'];
		}

		if (series == '') {
			logger.warn('no series in query');
			res.writeHead(500);
			res.end();
			return;
		}

		this.rawDumper.dump(series, {}, (data: any) : void => {
			res.setHeader('Content-Type', 'application/octet-stream');
			res.setHeader('Access-Control-Allow-Origin', '*');
			data.pipe(res);
		});
	}

}
