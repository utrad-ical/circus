/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/log4js/log4js.d.ts" />

/*----------------------------------------------

  DICOM server

-----------------------------------------------*/

// include require modules
var http = require('http');
var finalhandler = require('finalhandler');
var argv = require('minimist')(process.argv.slice(2));

// include config modules
var configFile = typeof argv.config === 'string' ? argv.config : '../config';
var config: any = require(configFile);

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

logger.info('CIRCUS RS is starting up...');

logger.info('Loading modules...');

import Metadata = require('./Metadata');
import MPR = require('./MPR');

var metadataModule = new Metadata(null);
var mprModule = new MPR(config.mpr);

// create DICOM Reader
import DicomReader = require('./DicomReader');
var reader = new DicomReader(config);

// setup routing
var Router = require('router');
var r = prepareRouter();

// create server process
var server = http.createServer(function(req, res) {
    r(req, res, finalhandler(req, res));
});
server.listen(config.port);

logger.info('Server running on port ' + config.port);

/////////////////////////////////////////////

function prepareRouter(): any
{
	var router = Router();

	router.get('/metadata', function(req, res) {
		metadataModule.process(req, res, reader);
	});
	router.get('/MPR', function(req, res) {
		mprModule.process(req, res, reader);
	});

	// TODO: append your custom module to router.

	return router;
}
