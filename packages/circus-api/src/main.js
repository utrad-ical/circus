// main server bootstrapping

import dashdash from 'dashdash';
import createApp from './createApp';
import { MongoClient } from 'mongodb';

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
		names: ['port', 'p'],
		env: 'PORT',
		type: 'number',
		helpArg: 'PORT',
		help: 'port (default: 8080)',
		default: 8080
	}
];

const { host, port } = (() => {
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

	const serverOptions = {
		debug: process.env.NODE_ENV !== 'production',
		db
	};

	try {
		const koaApp = await createApp(serverOptions);
		koaApp.listen(port, host, (err) => {
			if (err) throw err;
			console.log(`Server running on port ${host}:${port}`);
		});
	} catch(err) {
		console.error('Error during the server startup.');
		console.error(err);
	}
}

main();