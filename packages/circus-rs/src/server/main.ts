console.log('CIRCUS RS is starting up...');

import config from './Config';
import Server from './Server';

import loadModule, { ModuleType } from './ModuleLoader';

async function main() {
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

	const promise = new Promise<string>((resolve, reject) => {
		try {
			const port = config.port;
			const httpServer = app.listen(port, '0.0.0.0', () => {
				const message = `Server running on port ${port}`;
				logger.info(message);
				resolve(message);
			});
		} catch (e) {
			console.error('Server failed to start');
			console.error(e);
			logger.error(e);
			// This guarantees all the logs are flushed before actually exiting the program
			logger.shutdown().then(() => process.exit(1));
			reject(e);
		}
	});
	return promise;
}

main();