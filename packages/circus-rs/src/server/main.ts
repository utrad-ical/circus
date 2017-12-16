import config from './Config';
import Server from './Server';
import loadModule, { ModuleType } from './ModuleLoader';

function listen(app, ...args) {
	return new Promise((resolve, reject) => {
		const httpServer = app.listen.call(app, ...args, err => {
			if (err) reject(err); else resolve(httpServer);
		});
	});
}

async function main() {
	console.log('CIRCUS RS is starting up...');

	const logger = loadModule(ModuleType.Logger, config.logger);

	const server = new Server(
		logger,
		loadModule(ModuleType.ImageEncoder, config.imageEncoder),
		loadModule(ModuleType.DicomFileRepository, config.dicomFileRepository),
		loadModule(ModuleType.DicomDumper, config.dumper),
		config
	);
	server.prepare();
	const app = server.getApp();

	const port = config.port;
	try {
		const httpServer = await listen(app, port, '0.0.0.0');
		const message = `Server running on port ${port}`;
		logger.info(message);
	} catch (e) {
		console.error('Server failed to start');
		console.error(e);
		logger.error(e);
		// This guarantees all the logs are flushed before actually exiting the program
		logger.shutdown().then(() => process.exit(1));
	}
}

main();