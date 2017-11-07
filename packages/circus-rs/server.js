/**
 * CIRCUS RS
 */

// We register ts-node, which enables requiring *.ts
// files directly from Node.js
var tsOptions = require('./src/tsconfig').compilerOptions;
require('ts-node').register({
	compilerOptions: tsOptions,
	disableWarnings: true
});

console.log('CIRCUS RS is starting up...');

// Load configuration
var config = require('./src/server/Config');

// Execute server.
var Server = require('./src/server/Server').default;

var moduleLoader = require('./src/server/ModuleLoader');

var server = new Server(
	moduleLoader.loadModule(
		moduleLoader.ModuleType.Logger, config.logger
	),
	moduleLoader.loadModule(
		moduleLoader.ModuleType.ImageEncoder, config.imageEncoder
	),
	moduleLoader.loadModule(
		moduleLoader.ModuleType.DicomFileRepository, config.dicomFileRepository
	),
	moduleLoader.loadModule(
		moduleLoader.ModuleType.DicomDumper, config.dumper
	),
	config
);

server.start().then(function(message) {
	console.log(message);
}).catch(function(err) {
	console.error('Server failed to start');
	console.error(err);
});