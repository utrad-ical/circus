// main server bootstrapping

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import dashdash from 'dashdash';
import * as fs from 'fs';
import * as path from 'path';
import { safeLoad as yaml } from 'js-yaml';
import pify from 'pify';
import _glob from 'glob';
import Router from 'koa-router';
import errorHandler from './errorHandler';
import createValidator from './validation/createValidator';
import compose from 'koa-compose';
import validateInput from './validation/validateInput';

const glob = pify(_glob);

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

const koa = new Koa();
koa.use(
	errorHandler(), // Formats any error into JSON
	bodyParser({ enableTypes: ['json'] }) // Parses JSON request body
);

const router = new Router();

const handlerName = verb => {
	return 'handle' + verb[0].toUpperCase() + verb.substr(1);
};

const bootstrap = async () => {
	const find = path.resolve(__dirname, 'api', '**/*.yaml');

	const validator = await createValidator();
	koa.use(async (ctx, next) => { ctx.validator = validator; next(); });

	const settings = await glob(find);
	settings.forEach(settingFile => {
		try {
			const lines = fs.readFileSync(settingFile, 'utf8');
			const data = yaml(lines);
			data.routes.forEach(route => {
				const dir = path.dirname(settingFile);
				const handler = route.handler ? route.handler : handlerName(route.verb);
				const middleware = compose([
					require(dir)[handler]
				]);
				console.log(`registering ${route.verb} from ${dir}`);
				router[route.verb](route.path, middleware);
			});
		} catch (err) {
			console.error(err);
		}
	});
	koa.use(router.routes());
};

bootstrap();


koa.listen(port, host);
