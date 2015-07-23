/*----------------------------------------------
 DICOM server
 -----------------------------------------------*/

export = Server;

// include require modules
import http = require('http');
var finalhandler = require('finalhandler');

// include config modules
import Configuration = require('Configuration');
var config: Configuration = require('config');

import logger from './Logger';
logger.info('CIRCUS RS is starting up...');

import Counter from './Counter';
import PNGWriter from './PNGWriter';
import DicomReader from './DicomReader';
import DicomDumper from './DicomDumper';

// setup routing
import Metadata from './controllers/Metadata';
import ServerStatus from './controllers/ServerStatus';
import MPR from './controllers/MPRAction';
import Oblique from './controllers/ObliqueAction';
import Raw from './controllers/RawAction';

var Router = require('router');

class Server {
	public start(): void {
		// prepare routing
		var router = this.prepareRouter();

		// create server process
		var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
			router(req, res, finalhandler(req, res, {
				onerror: err => {
					Counter.countUp('_error');
					logger.info(err.toString());
				}
			}));
		});
		server.listen(config.port);

		logger.info('Server running on port ' + config.port);
	}

	private createDicomReader(): DicomReader {
		var module: string = config.pathResolver.module;
		logger.info('Using path resolver: ' + module);
		var resolverClass = require('./path-resolver/' + module);
		var resolver = new resolverClass(config.pathResolver.options);
		var dumperClass: any = require('./' + config.dumper.module).default;
		var dumper = new dumperClass(config.dumper.options);
		return new DicomReader(resolver, dumper, config.cache.memoryThreshold);

	}

	private createPngWriter(): PNGWriter {
		var module: string = config.pngWriter.module;
		logger.info('Using PNG writer: ' + module);
		var pngModule: any = require('./' + module).default;
		return new pngModule(config.pngWriter.options);
	}

	private prepareRouter(): any {
		var router = Router();
		var pngWriter = this.createPngWriter();
		var reader = this.createDicomReader();

		var routes: [string, any][] = [
			['metadata', Metadata],
			['MPR', MPR],
			['status', ServerStatus],
			['Oblique', Oblique],
			['raw', Raw]
		];
		routes.forEach(route => {
			logger.info('Loading ' + route[0] + ' module...');
			var controller = new route[1](reader, pngWriter);
			router.get('/' + route[0], (req, res) => {
				Counter.countUp(route[0]);
				controller.process(req, res, reader);
			});
		});
		return router;
	}
}
