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
import Ajv from 'ajv';

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

function formatValidationErrors(errors) {
	return errors.map(err => (
		`${err.dataPath} ${err.message}`
	)).join('\n');
}

/**
 * Creates a new Koa app.
 * @return A new Koa application.
 */
export default async function createApp(options = {}) {
	const { debug } = options;

	// The main Koa instance.
	const koa = new Koa();

	const validator = await createValidator(path.resolve(__dirname, 'schemas'));

	// ***** Prepare some tiny middleware functions ***
	// InjectValidator makes validator availabe
	const injectValidator = async (ctx, next) => {
		ctx.validator = validator;
		await next();
	};

	const cors = async(ctx, next) => {
		ctx.response.set('Access-Control-Allow-Origin', '*');
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

	const apiDir = path.resolve(__dirname, 'api/*/*.yaml');
	const manifestFiles = await glob(apiDir);

	const ajv = new Ajv({ allErrors: true });
	const metaSchema = path.resolve(__dirname, 'api/schema.yaml');
	const schemaValidator = ajv.compile(yaml(await fs.readFile(metaSchema)));

	for(const manifestFile of manifestFiles) {
		const data = yaml(await fs.readFile(manifestFile, 'utf8'));
		if (!schemaValidator(data)) {
			throw new TypeError(
				`Meta schema error at ${manifestFile}.\n` +
				formatValidationErrors(schemaValidator.errors)
			);
		}
		const dir = path.dirname(manifestFile);
		for (const route of data.routes) {
			if (route.forDebug && !debug) continue;
			const module = await import(dir);
			const mainHandler = module[handlerName(route)];
			if (typeof mainHandler !== 'function') {
				throw new Error('middleware not found');
			}
			const middlewareStack = compose([
				typeCheck(route.expectedContentType),
				validateInOut(validator, route.requestSchema, route.responseSchema),
				mainHandler // The processing function itself
			]);
			// console.log(`  Register ${route.verb.toUpperCase()} on ${route.path}`);
			router[route.verb](route.path, middlewareStack);
		}
	}

	// Register middleware stack to the Koa app.
	koa.use(errorHandler()); // Formats any error into JSON
	koa.use(cors); // Ensures the API can be invoked from anywhere
	koa.use(parser); // Parses JSON request body
	koa.use(injectValidator); // Makes validator available on all subsequent middleware
	koa.use(router.routes()); // Handles requests according to URL path

	return koa;
}