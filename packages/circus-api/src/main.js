// main server bootstrapping

import dashdash from 'dashdash';
import createApp from './createApp';
import connectDb from './db/connectDb';
import chalk from 'chalk';
import * as path from 'path';
import createLogger from './createLogger';
import log4js from 'log4js';

const options = [
	{
		names: ['help', 'h'],
		type: 'bool',
		help: 'print this help and exit'
	},
	{
		names: ['host', 'i'],
		env: 'IP',
		type: 'string',
		helpArg: 'HOST',
		help: 'IP address to listen to (default: localhost)',
		default: 'localhost'
	},
	{
		names: ['no-auth', 'n'],
		env: 'CIRCUS_API_NO_AUTH',
		type: 'bool',
		help: 'Skip all authentication',
		default: false
	},
	{
		names: ['port', 'p'],
		env: 'PORT',
		type: 'number',
		helpArg: 'PORT',
		help: 'port (default: 8080)',
		default: 8080
	},
	{
		names: ['debug', 'd'],
		type: 'bool',
		help: 'force debug mode'
	},
	{
		names: ['blob-path'],
		env: 'CIRCUS_API_BLOB_DIR',
		type: 'string',
		default: './store/blobs'
	}
];

const { debug, host, port, no_auth: noAuth, blobPath } = (() => {
	try {
		const parser = dashdash.createParser({ options });
		const opts = parser.parse();
		if (opts.help) {
			console.log('Usage: node server.js [OPTIONS]');
			console.log('Options:\n' + parser.help({ includeEnv: true }));
			process.exit(0);
		}
		opts.blobPath = path.resolve(path.dirname(__dirname), opts.blob_path);
		return opts;
	} catch (e) {
		console.log(e.message);
		process.exit(1);
	}
})();

async function main() {
	// Establish db connection (shared throughout app)
	const db = await connectDb();
	const logger = createLogger('trace');

	if (noAuth) {
		console.warn(chalk.red('WARNING: NO AUTHENTICATION MODE!'));
		logger.warn('CIRCUS API will start without authentication!');
	}

	const serverOptions = {
		debug: debug || process.env.NODE_ENV !== 'production',
		db,
		logger,
		noAuth,
		blobPath
	};

	try {
		const koaApp = await createApp(serverOptions);
		koaApp.listen(port, host, (err) => {
			if (err) throw err;
			logger.info('CIRCUS API started.');
			logger.info(`Label path: ${blobPath}`);
			console.log(chalk.green(`Server running on port ${host}:${port}`));
			console.log(`  Label path: ${blobPath}`);
		});
	} catch(err) {
		console.error(chalk.red('Error during the server startup.'));
		console.error(err);
	}

	process.on('SIGINT', () => {
		console.log('CIRCUS API Server terminating...');
		logger.warn('Server terminating...');
		log4js.shutdown(err => {
			if (err) console.error('Logger shutdown failed', err);
			process.exit(err ? 1 : 0);
		});
	});
}

main();