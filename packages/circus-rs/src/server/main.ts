console.log('CIRCUS RS is starting up...');

import config from './Config';
import Server from './Server';

const moduleLoader = require('./ModuleLoader');

const server = new Server(
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