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
import * as express from 'express';
import { Configuration } from './Configuration';
import { tokenAuthentication } from './auth/TokenAuthorization';
import { ipBasedAccessControl } from './auth/IpBasedAccessControl';
import { loadSeries, errorHandler } from './controllers/Middleware';

/**
 * Main server class.
 */
export default class Server {
	// injected modules
	protected helpers: ServerHelpers;

	public counter: Counter;
	protected express: express.Application;
	protected server: http.Server;
	protected config: Configuration;
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
			imageEncoder
		};

		this.loadedModuleNames.push((logger.constructor as any).name); // 'name' is ES6 feature
		this.loadedModuleNames.push((imageEncoder.constructor as any).name);
		this.loadedModuleNames.push((dicomFileRepository.constructor as any).name);
		this.loadedModuleNames.push((dicomDumper.constructor as any).name);

		this.helpers.logger.info('Modules loaded: ', this.loadedModuleNames.join(', '));

		this.counter = new Counter();
	}

	public getServer(): http.Server {
		return this.server;
	}

	public getApp(): express.Application {
		return this.express;
	}

	public start(): Promise<string> {
		// prepare routing
		return new Promise((resolve, reject) => {
			try {
				// create server process
				this.express = express();

				// Make server return indented JSON
				this.express.set('json spaces', 2);
				// Turn off 'X-Powered-By: Express' header
				this.express.set('x-powered-by', false);
				// Enable case sensitive routing
				this.express.set('case sensitive routing', true);

				this.express.locals.counter = this.counter;
				this.express.locals.loadedModuleNames = this.loadedModuleNames;

				this.buildRoutes();

				const port = this.config.port;
				this.server = this.express.listen(port, '0.0.0.0', () => {
					const message = `Server running on port ${port}`;
					this.helpers.logger.info(message);
					resolve(message);
				});
			} catch (e) {
				console.error(e);
				this.helpers.logger.error(e);
				// This guarantees all the logs are flushed before actually exiting the program
				this.helpers.logger.shutdown().then(() => process.exit(1));
				reject(e);
			}
		});
	}

	public close(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.server.close(err => {
				if (err) {
					reject(err);
				} else {
					this.helpers.seriesReader.dispose();
					resolve();
				}
			});
		});
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

	private loadRouter(moduleName): express.RequestHandler | express.RequestHandler[] {
		type Processor = (helpers: ServerHelpers) => express.RequestHandler | express.RequestHandler[];
		const execute: Processor = require(`./controllers/${moduleName}`).execute;
		return execute(this.helpers);
	}

	private countUp(name): express.Handler {
		return (req, res, next) => { this.counter.countUp(name); next(); };
	}

	private buildRoutes(): void {
		const config = this.config;

		const useAuth = !!config.authorization.enabled;
		this.express.locals.authorizationEnabled = useAuth;

		// Set up global IP filter
		if (typeof config.globalIpFilter === 'string') {
			const globalBlocker = ipBasedAccessControl(config.globalIpFilter);
			this.express.use(globalBlocker);
		}

		// Add global request handler
		this.express.use((req, res: express.Response, next) => {
			// Always append the following header
			res.set('Access-Control-Allow-Origin', '*');
			this.helpers.logger.info(req.url, req.hostname);
			next();
		});

		const authorizationCache = new AuthorizationCache(config.authorization);
		this.express.locals.authorizationCache = authorizationCache;

		// Set up series router
		const seriesRouter = express.Router({ mergeParams: true });
		seriesRouter.options('*', (req, res, next) => {
			res.status(200);
			res.setHeader('Access-Control-Allow-Methods', 'GET');
			res.setHeader('Access-Control-Allow-Headers', 'Authorization');
			res.end();
		});
		if (useAuth) {
			seriesRouter.use(tokenAuthentication(authorizationCache));
		}
		seriesRouter.use(loadSeries(this.helpers));

		const seriesRoutes = ['metadata', 'scan', 'volume'];
		seriesRoutes.forEach(route => {
			seriesRouter.get(
				`/${route}`,
				this.countUp(route),
				this.loadRouter(`series/${route}`)
			);
		});

		this.express.use('/series/:sid', seriesRouter);

		// path name, process class name, needs token authorization
		this.express.get(
			'/status',
			this.countUp('status'),
			this.loadRouter('ServerStatus')
		);

		if (useAuth) {
			const ipBlockerMiddleware = ipBasedAccessControl(config.authorization.tokenRequestIpFilter);
			this.express.get(
				'/token',
				this.countUp('token'),
				ipBlockerMiddleware,
				this.loadRouter('RequestToken')
			);
		}

		// This is a default handler to catch all unknown requests of all types of verbs
		this.express.all('*', (req, res, next) => {
			const error = new Error('Not found');
			(<any>error).status = 404;
			next(error);
		});

		// Adds an error handler which outputs all errors in JSON format
		this.express.use(errorHandler(this.helpers.logger));

	}

}

