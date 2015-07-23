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
var configFile = typeof argv.config === 'string' ? argv.config : '../config';
process.env.NODE_CONFIG_DIR = __dirname + '/../config';
import Configuration = require('Configuration');
var config: Configuration = require('config');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

import Counter = require('./Counter');

logger.info('CIRCUS RS is starting up...');

logger.info('Loading modules...');

import Metadata = require('./Metadata');
import ServerStatus = require('./ServerStatus');
import MPR = require('./MPRAction');
import Oblique = require('./ObliqueAction');
import Raw = require('./RawAction');

var metadataModule = new Metadata(null);
var mprModule = new MPR(config);
var serverStatus = new ServerStatus(null);
var obliqueModule = new Oblique(config);
var rawModule = new Raw(config);

// create DICOM Reader
import DicomReader = require('./DicomReader');
var reader = (() => {
	var resolverClass = require('./path-resolver/' + config.pathResolver.module);
	var resolver = new resolverClass(config.pathResolver.options);
	var dumperClass = require('./' + config.dumper.module);
	var dumper = new dumperClass(config.dumper.options);
	return new DicomReader(resolver, dumper, config.cache.memoryThreshold);
})();

// setup routing
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

	router.get('/metadata', function(req, res) {
		Counter.countUp('metadata');
		metadataModule.process(req, res, reader);
	});
	router.get('/MPR', function(req, res) {
		Counter.countUp('MPR');
		mprModule.process(req, res, reader);
	});
	router.get('/status', function(req, res) {
		Counter.countUp('status');
		serverStatus.process(req, res, reader);
	});
	router.get('/Oblique', function(req, res) {
		Counter.countUp('Oblique');
		obliqueModule.process(req, res, reader);
	});
	router.get('/raw', function(req, res) {
		Counter.countUp('raw');
		rawModule.process(req, res, reader);
	});

	return router;
}
