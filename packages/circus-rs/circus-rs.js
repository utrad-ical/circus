/**
 * CIRCUS RS
 */

// Load configuration
var config = require('./lib/server/Config');

// Execute server.
var Server = require('./lib/server/Server').default;

var moduleLoader = require('./lib/server/ModuleLoader');

var server = new Server(
	moduleLoader.loadModule(moduleLoader.ModuleType.ImageEncoder, config.imageEncoder),
	moduleLoader.loadModule(moduleLoader.ModuleType.DicomFileRepository, config.dicomFileRepository),
	moduleLoader.loadModule(moduleLoader.ModuleType.DicomDumper, config.dumper),
	config
);


server.start();
