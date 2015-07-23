/**
 * MPR Image generator class
 */

import RawData from '../RawData';
import DicomRawDumper from '../DicomRawDumper';
import Controller from './Controller';

import http = require('http');

import logger from '../Logger';

var config = require('config');

export default class RawAction extends Controller {

	rawDumper: DicomRawDumper;

	protected initialize() {
		super.initialize();
		var rawDumperModule: any = require('../' + config.rawDumper.module).default;
		this.rawDumper = new rawDumperModule(config);
	}

	public process(query: any, res: http.ServerResponse): void
	{
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
