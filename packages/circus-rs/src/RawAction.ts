/**
 * MPR Image generator class
 */
var url = require('url');

import RawData = require('./RawData');
import DicomReader = require('./DicomReader');
import DicomRawDumper = require('./DicomRawDumper');
import DicomServerModule = require('./DicomServerModule');

import http = require('http');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = RawAction;

class RawAction extends DicomServerModule {

	rawDumper: DicomRawDumper;

	protected initialize() {
		super.initialize();

		var rawDumperModule = require('./' + this.config.rawDumper.module);
		this.rawDumper = new rawDumperModule(this.config);
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
			res.setHeader('Content-Type', 'applilcation/octet-stream');
			data.pipe(res);
		});
	}

}
