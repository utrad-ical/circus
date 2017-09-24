import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import * as fs from 'fs-extra';
import * as path from 'path';
import { safeLoad as yaml } from 'js-yaml';
import glob from 'glob-promise';
import Router from 'koa-router';
import errorHandler from './middleware/errorHandler';
import createValidator from './validation/createValidator';
import validateInOut from './validation/validateInOut';
import compose from 'koa-compose';
// import validateInput from './validation/validateInput';

function typeCheck(expectedType = 'application/json') {
	return async function typeCheck(ctx, next) {
		if (!/^(POST|PUT|PATCH)$/.test(ctx.request.method) || ctx.request.body.length === 0) {
			await next();
			return;
		}

		if (typeof ctx.request.type !== 'string' || ctx.request.type.length === 0) {
			ctx.throw(401, 'Content-type is unspecified.');
			return;
		}

		const contentType = /^([^;]*)/.exec(ctx.request.type)[1];
		if (contentType !== expectedType) {
			ctx.throw(415, 'This content-type is unsupported.');
			return;
		}
		await next();
	};
}

function handlerName(route) {
	if (route.handler) return route.handler;
	return 'handle' + route.verb[0].toUpperCase() + route.verb.substr(1);
}

function registerApiRoute(router, validator, dir, route) {
	const middlewareStack = compose([
		typeCheck(route.expectedContentType),
		validateInOut(validator, route.requestSchema, route.responseSchema),
		require(dir)[handlerName(route)] // The processing function itself
	]);

	// console.log(`  Register ${route.verb.toUpperCase()} on ${route.path}`);
	router[route.verb](route.path, middlewareStack);
}

/**
 * Creates a new Koa app.
 * @return A new Koa application.
 */
export default async function createApp() {
	// The main Koa instance.
	const koa = new Koa();

	const validator = await createValidator();

	// ***** Prepare some tiny middleware functions ***
	// InjectValidator makes validator availabe
	const injectValidator = async (ctx, next) => {
		ctx.state.validator = validator;
		await next();
	};
	
	const parser = bodyParser({
		enableTypes: ['json'],
		jsonLimit: '1mb',
		onerror: (err, ctx) => ctx.throw(400, 'Invalid JSON as request body.\n' + err.message)
	});

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
	koa.use(parser); // Parses JSON request body
	koa.use(injectValidator); // Makes validator available on all subsequent middleware
	koa.use(router.routes()); // Handles requests according to URL path

	return koa;
}