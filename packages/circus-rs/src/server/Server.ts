import * as http from 'http';
let finalhandler = require('finalhandler');

import logger, { shutdown as loggerShutdown } from './Logger';
logger.info('================================');
logger.info('CIRCUS RS is starting up...');

import Counter from './Counter';
import ImageEncoder from './image-encoders/ImageEncoder';

import DicomVolume from '../common/DicomVolume';
import AsyncLruCache from '../common/AsyncLruCache';

import DicomDumper from './dicom-dumpers/DicomDumper';
import PathResolver from './path-resolvers/PathResolver';
import AuthorizationCache from './AuthorizationCache';
import TokenAuthenticationBridge from './controllers/TokenAuthenticationBridge';
import Controller from './controllers/Controller';

let Router = require('router');

/**
 * Main server class.
 */
class Server {
	public counter: Counter;
	protected server: http.Server;
	protected config: Configuration;
	protected dicomReader: AsyncLruCache<DicomVolume>;
	public loadeModuleNames: string[] = [];

	constructor(config: Configuration) {
		this.config = config;
		this.counter = new Counter;
	}

	public getServer(): http.Server {
		return this.server;
	}

	public start(): void {
		// prepare routing
		try {
			let router = this.prepareRouter();
			// create server process
			this.server = http.createServer();
			this.server.on('request', (req: http.ServerRequest, res: http.ServerResponse) => {
				router(req, res, finalhandler(req, res, {
					onerror: (err): void => {
						this.counter.countUp('_error');
						logger.info(err.toString());
					}
				}));
			});
			this.server.on('error', err => {
				logger.error('Server error occurred.');
				logger.error(err);
				loggerShutdown(() => process.exit(1));
			});
			this.server.listen(this.config.port);
			logger.info('Server running on port ' + this.config.port);
		} catch (e) {
			console.error(e);
			logger.error(e);
			// This guarantees all the logs are flushed before actually exiting the program
			loggerShutdown(() => process.exit(1));
		}
	}

	public close(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.server.close(err => {
				if (err) {
					reject(err);
				} else {
					this.dicomReader.dispose();
					resolve(null);
				}
			});
		});
	}

	private loadModule(descriptor: any, type: string): any {
		let module: string;
		if (/\//.test(descriptor.module)) {
			// Load external module if module path is explicitly set
			module = descriptor.module;
		} else {
			// Load built-in modules
			let dir = {
				'DICOM dumper': './dicom-dumpers/',
				'path resolver': './path-resolvers/',
				'image encoder': './image-encoders/'
			}[type];
			module = dir + descriptor.module;
		}
		logger.info(`Using ${type}: ${module}`);
		let theClass = require(module).default;
		this.loadeModuleNames.push(theClass.name);
		return new theClass(descriptor.options || {});
	}

	private createDicomReader(): AsyncLruCache<DicomVolume> {
		let cfg = this.config;
		let resolver: PathResolver = this.loadModule(cfg.pathResolver, 'path resolver');
		let dumper: DicomDumper = this.loadModule(cfg.dumper, 'DICOM dumper');
		return new AsyncLruCache<DicomVolume>(
			seriesUID => {
				return resolver
					.resolvePath(seriesUID)
					.then(dcmdir => dumper.readDicom(dcmdir, 'all'));
			},
			{
				maxSize: this.config.cache.memoryThreshold,
				sizeFunc: (r): number => r.dataSize
			}
		);
	}

	private prepareRouter(): any {
		let config = this.config;
		let router = Router();
		let imageEncoder = this.loadModule(config.imageEncoder, 'image encoder');
		this.dicomReader = this.createDicomReader();
		let authorizationCache = new AuthorizationCache(config.authorization);

		// path name, process class name, needs token authorization, additionl depts to inject
		let routes: [string, string, boolean, any][] = [
			['metadata', 'Metadata', true, {}],
			['mpr', 'MPRAction', true, {}],
			['scan', 'ObliqueScan', true, {}],
			['volume', 'VolumeAction', true, {}],
			['status', 'ServerStatus', false, {server: this}]
		];

		if (config.authorization.require) {
			routes.push([
				'requestToken', 'RequestAccessTokenAction', false,
				{cache: authorizationCache, allowFrom: config.authorization.allowFrom}
			]);
		}

		routes.forEach(route => {
			let [ routeName, moduleName, needsAuth, deps ] = route;
			logger.info(`Loading ${moduleName} module...`);
			let module: typeof Controller = require(`./controllers/${moduleName}`).default;
			let controller = new module(this.dicomReader, imageEncoder);
			for (let k in deps) controller[k] = deps[k];

			// If token authorization is required, use this middleware
			if (config.authorization.require && needsAuth) {
				controller = new TokenAuthenticationBridge(
					controller, authorizationCache, this.dicomReader, imageEncoder);
			}

			router.get('/' + routeName, (req, res) => {
				this.counter.countUp(routeName);
				controller.execute(req, res);
			});
			// CrossOrigin Resource Sharing http://www.w3.org/TR/cors/
			router.options('/' + routeName, (req, res) => {
				controller.options(req, res);
			});
		});

		return router;
	}
}

export = Server;
