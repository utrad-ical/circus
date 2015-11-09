/**
 * Main server class.
 */

import * as http from 'http';
let finalhandler = require('finalhandler');

import logger from './Logger';
logger.info('================================');
logger.info('CIRCUS RS is starting up...');
import log4js = require('log4js');
import * as Promise from 'bluebird';

import Counter from './Counter';
import ImageEncoder from './image-encoders/ImageEncoder';

import DicomVolume from './DicomVolume';
import AsyncLruCache from './AsyncLruCache';

import DicomDumper from './dicom-dumpers/DicomDumper';
import PathResolver from './path-resolvers/PathResolver';
import AuthorizationCache from './AuthorizationCache';
import TokenAuthenticationBridge from './controllers/TokenAuthenticationBridge';
import Controller from './controllers/Controller';

let Router = require('router');

class Server {
	public counter: Counter;
	protected server: http.Server;
	protected config: Configuration;
	protected dicomReader: AsyncLruCache<DicomVolume>;

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
				log4js.shutdown(() => process.exit(1));
			});
			this.server.listen(this.config.port);
			logger.info('Server running on port ' + this.config.port);
		} catch (e) {
			logger.error(e);
			// This guarantees all the logs are flushed before actually exiting the program
			log4js.shutdown(() => process.exit(1));
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

	private createDicomReader(): AsyncLruCache<DicomVolume> {
		let module: string = this.config.pathResolver.module;
		logger.info('Using path resolver: ' + module);
		let resolverClass: typeof PathResolver = require('./path-resolvers/' + module).default;
		let resolver = new resolverClass(this.config.pathResolver.options);
		module = this.config.dumper.module;
		logger.info('Using DICOM dumper: ' + module);
		let dumperClass: typeof DicomDumper = require('./dicom-dumpers/' + module).default;
		let dumper = new dumperClass(this.config.dumper.options);
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

	private createImageEncoder(): ImageEncoder {
		let module: string = this.config.imageEncoder.module;
		logger.info('Using Image Encoder: ' + module);
		let imageEncoder: typeof ImageEncoder = require('./image-encoders/' + module).default;
		return new imageEncoder(this.config.imageEncoder.options);
	}

	private prepareRouter(): any {
		let config = this.config;
		let router = Router();
		let imageEncoder = this.createImageEncoder();
		this.dicomReader = this.createDicomReader();
		let authorizationCache = new AuthorizationCache(config.authorization);

		// path name, process class name, needs token authorization, additionl depts to inject
		let routes: [string, string, boolean, any][] = [
			['metadata', 'Metadata', true, {}],
			['mpr', 'MPRAction', true, {}],
			['oblique', 'ObliqueAction', true, {}],
			['status', 'ServerStatus', false, {counter: this.counter}],
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
