import Counter from './Counter';
import ImageEncoder from './image-encoders/ImageEncoder';

import DicomVolume from '../common/DicomVolume';
import AsyncLruCache from '../common/AsyncLruCache';

import Logger from './loggers/Logger';
import DicomDumper from './dicom-dumpers/DicomDumper';
import DicomFileRepository from './dicom-file-repository/DicomFileRepository';
import AuthorizationCache from './auth/AuthorizationCache';
import { ServerHelpers } from './ServerHelpers';

import * as http from 'http';
import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as mount from 'koa-mount';
import * as compose from 'koa-compose';
import * as koaJson from 'koa-json';
import { Configuration } from './Configuration';
import tokenAuthentication from './routes/middleware/TokenAuthorization';
import ipBasedAccessControl from './routes/middleware/IpBasedAccessControl';
import loadSeries from './routes/middleware/LoadSeries';
import errorHandler from './routes/middleware/ErrorHandler';
import countUp from './routes/middleware/CountUp';
import StatusError from './routes/Error';

/**
 * Main server class.
 */
export default class Server {
	// injected modules
	protected helpers: ServerHelpers;

	protected config: Configuration;

	protected app: Koa;
	protected locals: any = {};
	public loadedModuleNames: string[] = [];

	constructor(
		logger: Logger,
		imageEncoder: ImageEncoder,
		dicomFileRepository: DicomFileRepository,
		dicomDumper: DicomDumper,
		config: Configuration
	) {
		this.config = config;

		this.helpers = {
			logger,
			seriesReader: this.createDicomReader(dicomFileRepository, dicomDumper),
			imageEncoder,
			authorizationCache: new AuthorizationCache(config.authorization),
			counter: new Counter()
		};

		this.loadedModuleNames.push((logger.constructor as any).name); // 'name' is ES6 feature
		this.loadedModuleNames.push((imageEncoder.constructor as any).name);
		this.loadedModuleNames.push((dicomFileRepository.constructor as any).name);
		this.loadedModuleNames.push((dicomDumper.constructor as any).name);

		this.helpers.logger.info('Modules loaded: ', this.loadedModuleNames.join(', '));
	}

	public createServer(): Koa {
		// create server process
		const app = new Koa();
		this.app = app;
		this.locals.loadedModuleNames = this.loadedModuleNames;

		this.buildRoutes();
		return app;
	}

	private createDicomReader(
		repository: DicomFileRepository, dicomDumper: DicomDumper
	): AsyncLruCache<DicomVolume> {
		return new AsyncLruCache<DicomVolume>(
			seriesUID => {
				return repository.getSeriesLoader(seriesUID)
					.then(loaderInfo => dicomDumper.readDicom(loaderInfo, 'all'));
			},
			{
				maxSize: this.config.cache.memoryThreshold,
				sizeFunc: (r): number => r.dataSize
			}
		);
	}

	private loadRouter(moduleName): Koa.Middleware {
		const module = require(`./routes/${moduleName}`).default;
		return module(this.helpers);
	}

	private createSeriesRouter(): Router {
		const router = new Router();
		const seriesRoutes = ['metadata', 'scan', 'volume'];
		seriesRoutes.forEach(route => {
			router.get(
				`/${route}`,
				this.loadRouter(`series/${route}`)
			);
		});
		return router;
	}

	private buildRoutes(): void {
		const config = this.config;
		const app = this.app;

		const useAuth = !!config.authorization.enabled;
		this.locals.authorizationEnabled = useAuth;

		// Set up global IP filter
		if (typeof config.globalIpFilter === 'string') {
			app.use(ipBasedAccessControl(
				this.helpers, config.globalIpFilter
			));
		}

		// Pretty-pring JSON output
		app.use(koaJson());

		// Adds an error handler which outputs all errors in JSON format
		app.use(errorHandler(this.helpers.logger));

		// Add global request handler
		app.use(async (ctx, next) => {
			// Always append the following header
			ctx.response.set('Access-Control-Allow-Origin', '*');
			this.helpers.logger.info(ctx.request.url, ctx.request.hostname);
			ctx.state.locals = this.locals;
			await next();
		});

		// Counts the number of requests
		app.use(countUp(this.helpers));

		const router = new Router();
		router.get('/status', this.loadRouter('ServerStatus'));

		// Set up 'token' route
		if (useAuth) {
			const ipBlockerMiddleware = ipBasedAccessControl(
				this.helpers, config.authorization.tokenRequestIpFilter
			);
			router.get(
				'/token',
				compose([
					ipBlockerMiddleware,
					this.loadRouter('RequestToken')
				])
			);
		}

		router.options('/series/*', async (ctx, next) => {
			ctx.status = 200;
			ctx.response.set('Access-Control-Allow-Methods', 'GET');
			ctx.response.set('Access-Control-Allow-Headers', 'Authorization');
			await next();
		});
		const token = useAuth ? [tokenAuthentication(this.helpers)] : [];
		const load = loadSeries(this.helpers);

		const seriesRouter = this.createSeriesRouter();

		router.use('/series/:sid', compose([...token, load]));
		router.use('/series/:sid', seriesRouter.routes());

		// Assign the router
		app.use(router.routes());

		// This is a default handler to catch all unknown requests of all types of verbs
		app.use(async (ctx, next) => {
			throw StatusError.notFound('Not found');
		});

	}

}

