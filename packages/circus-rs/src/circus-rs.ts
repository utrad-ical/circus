/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/log4js/log4js.d.ts" />

/*----------------------------------------------

  DICOM server

-----------------------------------------------*/

// include require modules
import http = require('http');
var finalhandler = require('finalhandler');
var argv = require('minimist')(process.argv.slice(2));

// include config modules
process.env.NODE_CONFIG_DIR = __dirname + '/../config';
import Configuration = require('Configuration');
var config: Configuration = require('config');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

logger.info('CIRCUS RS is starting up...');

import Counter = require('./Counter');
import PNGWriter = require('./Counter');
import DicomReader = require('./DicomReader');

logger.info('Loading modules...');

// set up DICOM Reader
var reader = (() => {
	var module: string = config.pathResolver.module;
	logger.info('Using path resolver: ' + module);
	var resolverClass = require('./path-resolver/' + module);
	var resolver = new resolverClass(config.pathResolver.options);
	var dumperClass = require('./' + config.dumper.module);
	var dumper = new dumperClass(config.dumper.options);
	return new DicomReader(resolver, dumper, config.cache.memoryThreshold);
})();

// set up PNG writer
var pngWriter: PNGWriter = (() => {
	var module: string = config.pngWriter.module;
	logger.info('Using PNG writer: ' + module);
	var pngModule = require('./' + module);
	return new pngModule(config.pngWriter.options);
})();

// setup routing
import Metadata = require('./controllers/Metadata');
import ServerStatus = require('./controllers/ServerStatus');
import MPR = require('./controllers/MPRAction');
import Oblique = require('./controllers/ObliqueAction');

var Router = require('router');
var router = prepareRouter();

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

/////////////////////////////////////////////

function prepareRouter(): any
{
	var router = Router();
	var routes: [string, any][] = [
		['metadata', Metadata],
		['MPR', MPR],
		['status', ServerStatus],
		['Oblique', Oblique]
	];
	routes.forEach(route => {
		logger.info('Preparing ' + route[0] + ' module...');
		var controller = new route[1](reader, pngWriter);
		router.get('/' + route[0], (req, res) => {
			Counter.countUp(route[0]);
			controller.process(req, res, reader);
		});
	});
	return router;
}
