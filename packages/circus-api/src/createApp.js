import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import * as fs from 'fs-extra';
import * as path from 'path';
import { safeLoad as yaml } from 'js-yaml';
import pify from 'pify';
import _glob from 'glob';
import Router from 'koa-router';
import errorHandler from './errorHandler';
import createValidator from './validation/createValidator';
import validateInOut from './validation/validateInOut';
import compose from 'koa-compose';
// import validateInput from './validation/validateInput';

const glob = pify(_glob);

function registerApiRoute(router, validator, dir, route) {
	const handler = route.handler ? route.handler : defaultHandlerName(route.verb);

	const middlewareStack = compose([
		validateInOut(validator, route.requestSchema, route.responseSchema),
		require(dir)[handler] // The processing function itself
	]);

	console.log(`  Register ${route.verb.toUpperCase()} on ${route.path}`);
	router[route.verb](route.path, middlewareStack);
}

function defaultHandlerName(verb) {
	return 'handle' + verb[0].toUpperCase() + verb.substr(1);
}

/**
 * Creates a new Koa app.
 * @return A new Koa application.
 */
export default async function createApp() {
	// The main Koa instance.
	const koa = new Koa();

	const validator = await createValidator();
	const injectValidator = async (ctx, next) => {
		ctx.state.validator = validator;
		await next();
	};

	// Build a router.
	// Register each API endpoints to the router according YAML manifest files.
	const router = new Router();

	const apiDir = path.resolve(__dirname, 'api/**/*.yaml');
	const manifestFiles = await glob(apiDir);

	for(const manifestFile of manifestFiles) {
		const data = yaml(await fs.readFile(manifestFile, 'utf8'));
		const dir = path.dirname(manifestFile);
		for (const route of data.routes) {
			registerApiRoute(router, validator, dir, route);
		}
	}

	// Register middleware stack to the Koa app.
	koa.use(errorHandler()); // Formats any error into JSON
	koa.use(bodyParser({ enableTypes: ['json'] })); // Parses JSON request body
	koa.use(injectValidator); // Makes validator available on all subsequent middleware
	koa.use(router.routes()); // Handles requests according to URL path

	return koa;
}