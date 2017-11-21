import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import * as fs from 'fs-extra';
import * as path from 'path';
import { safeLoad as yaml } from 'js-yaml';
import glob from 'glob-promise';
import Router from 'koa-router';
import mount from 'koa-mount';
import createOauthServer from './middleware/auth/createOauthServer';
import errorHandler from './middleware/errorHandler';
import cors from './middleware/cors';
import injector from './middleware/injector';
import checkGlobalPrivileges from './middleware/auth/checkGlobalPrivileges';
import checkProjectPrivileges, { injectCaseAndProject } from './middleware/auth/checkProjectPrivileges';
import typeCheck from './middleware/typeCheck';
import createValidator from './createValidator';
import createStorage from './storage/createStorage';
import createLogger from './createLogger';
import validateInOut from './middleware/validateInOut';
import createModels from './db/createModels';
import compose from 'koa-compose';

function handlerName(route) {
	if (route.handler) return route.handler;
	return 'handle' + route.verb[0].toUpperCase() + route.verb.substr(1);
}

function formatValidationErrors(errors) {
	return errors.map(err => (
		`${err.dataPath} ${err.message}`
	)).join('\n');
}

async function prepareApiRouter(apiDir, validator, options) {
	const { debug, noAuth } = options;
	const router = new Router();

	const manifestFiles = await glob(apiDir);
	for(const manifestFile of manifestFiles) {
		const data = yaml(await fs.readFile(manifestFile, 'utf8'));
		try {
			validator.validate('api', data);
		} catch (err) {
			throw new TypeError(
				`Meta schema error at ${manifestFile}.\n` +
				formatValidationErrors(err.errors)
			);
		}
		const dir = path.dirname(manifestFile);
		for (const route of data.routes) {
			if (route.forDebug && !debug) continue;
			const module = require(dir);
			const mainHandler = module[handlerName(route)];
			if (typeof mainHandler !== 'function') {
				throw new Error('middleware not found');
			}
			const globalCheck = !noAuth && route.requiredGlobalPrivilege ?
				[checkGlobalPrivileges(route.requiredGlobalPrivilege)] : [];
			const inject = route.requiredProjectPrivilege ?
				[injectCaseAndProject()] : [];
			const projectCheck = !noAuth && route.requiredProjectPrivilege ?
				[checkProjectPrivileges(route.requiredProjectPrivilege)] : [];

			const middlewareStack = compose([
				typeCheck(route.expectedContentType),
				...globalCheck,
				...inject,
				...projectCheck,
				validateInOut(validator, {
					requestSchema: route.requestSchema,
					requestValidationOptions: route.requestValidationOptions,
					responseSchema: route.responseSchema,
					responseValidationOptions: route.responseValidationOptions
				}),
				mainHandler // The processing function itself
			]);
			// console.log(`  Register ${route.verb.toUpperCase()} on ${route.path}`);
			router[route.verb](route.path, middlewareStack);
		}
	}

	return router;
}

/**
 * Creates a new Koa app.
 */
export default async function createApp(options = {}) {
	const { debug, db, noAuth, blobPath } = options;

	// The main Koa instance.
	const koa = new Koa();

	const validator = await createValidator(path.resolve(__dirname, 'schemas'));
	const models = createModels(db, validator);
	const blobStorage = blobPath ?
		await createStorage('local', { root: blobPath }) :
		await createStorage('memory');

	const logger = options.logger ? options.logger : createLogger('off');

	// Build a router.
	// Register each API endpoints to the router according YAML manifest files.
	const apiDir = path.resolve(__dirname, 'api/**/*.yaml');
	const apiRouter = await prepareApiRouter(apiDir, validator, options);

	const oauth = createOauthServer(models, debug);
	const authSection = compose([
		errorHandler(debug, logger),
		cors(),
		bodyParser({
			enableTypes: ['json'],
			jsonLimit: '1mb',
			onerror: (err, ctx) => ctx.throw(400, 'Invalid JSON as request body.\n' + err.message)
		}),
		injector({ validator, db, logger, models, blobStorage }),
		...( noAuth ? [] : [oauth.authenticate()]),
		apiRouter.routes()
	]);

	// Register middleware stack to the Koa app.
	koa.use(mount('/api', authSection));
	koa.use(mount(
		'/login',
		compose([errorHandler(debug), bodyParser(), oauth.token()])
	));

	return koa;
}