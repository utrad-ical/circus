// main server bootstrapping

import dashdash from 'dashdash';
import createApp from './createApp';
import { MongoClient } from 'mongodb';
import chalk from 'chalk';

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
	}
];

const { host, port, no_auth: noAuth } = (() => {
	try {
		const parser = dashdash.createParser({ options });
		const opts = parser.parse();
		if (opts.help) {
			console.log('Usage: node server.js [OPTIONS]');
			console.log('Options:\n' + parser.help({ includeEnv: true }));
			process.exit(0);
		}
		return opts;
	} catch (e) {
		console.log(e.message);
		process.exit(1);
	}
})();

async function main() {
	// Establish db connection (shared throughout app)
	const db = await MongoClient.connect(process.env.MONGO_URL);

	if (noAuth) {
		console.warn(chalk.red('WARNING: NO AUTHENTICATION MODE!'));
	}

	const serverOptions = {
		debug: process.env.NODE_ENV !== 'production',
		db,
		noAuth
	};

	try {
		const koaApp = await createApp(serverOptions);
		koaApp.listen(port, host, (err) => {
			if (err) throw err;
			console.log(chalk.green(`Server running on port ${host}:${port}`));
		});
	} catch(err) {
		console.error(chalk.red('Error during the server startup.'));
		console.error(err);
	}
}

main();