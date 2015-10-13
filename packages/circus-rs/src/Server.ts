/**
 * Main server class.
 */

import http = require('http');
var finalhandler = require('finalhandler');

// Load configuration
var config: Configuration = require('config');

import logger from './Logger';
logger.info('================================');
logger.info('CIRCUS RS is starting up...');
import log4js = require('log4js');

import Counter from './Counter';
import ImageEncoder from './image-encoder/ImageEncoder';

import RawData from './RawData';
import AsyncLruCache from './AsyncLruCache';

import DicomDumper from './DicomDumper';
import PathResolver from './path-resolver/PathResolver';
import AuthorizationCache from './AuthorizationCache';
import TokenAuthenticationBridge from './controllers/TokenAuthenticationBridge';
import Controller from './controllers/Controller';

var Router = require('router');

class Server {
	public counter: Counter;

	constructor() {
		this.counter = new Counter;
	}

	public start(): void {
		// prepare routing
		try {
			var router = this.prepareRouter();
			// create server process
			var server = http.createServer();
			server.on('request', (req: http.ServerRequest, res: http.ServerResponse) => {
				router(req, res, finalhandler(req, res, {
					onerror: err => {
						this.counter.countUp('_error');
						logger.info(err.toString());
					}
				}));
			});
			server.on('error', err => {
				logger.error('Server error occurred.');
				logger.error(err);
				log4js.shutdown(() => process.exit(1));
			});
			server.listen(config.port);
			logger.info('Server running on port ' + config.port);
		} catch (e) {
			logger.error(e);
			// This guarantees all the logs are flushed before actually exiting the program
			log4js.shutdown(() => process.exit(1));
		}
	}

	private createDicomReader(): AsyncLruCache<RawData> {
		var module: string = config.pathResolver.module;
		logger.info('Using path resolver: ' + module);
		var resolverClass: typeof PathResolver = require('./path-resolver/' + module).default;
		var resolver = new resolverClass(config.pathResolver.options);
		module = config.dumper.module;
		logger.info('Using DICOM dumper: ' + module);
		var dumperClass: typeof DicomDumper = require('./' + module).default;
		var dumper = new dumperClass(config.dumper.options);
		return new AsyncLruCache<RawData>(
			seriesUID => {
				return resolver
					.resolvePath(seriesUID)
					.then(dcmdir => dumper.readDicom(dcmdir, 'all'))
			},
			{
				maxSize: config.cache.memoryThreshold,
				sizeFunc: r => r.dataSize
			}
		)
	}

	private createImageEncoder(): ImageEncoder {
		var module: string = config.imageEncoder.module;
		logger.info('Using Image Encoder: ' + module);
		var imageEncoder: typeof ImageEncoder = require('./image-encoder/' + module).default;
		return new imageEncoder(config.imageEncoder.options);
	}

	private prepareRouter(): any {
		var router = Router();
		var imageEncoder = this.createImageEncoder();
		var reader = this.createDicomReader();
		var authorizationCache = new AuthorizationCache(config.authorization);

		// path name, process class name, needs token authorization, additionl depts to inject
		var routes: [string, string, boolean, any][] = [
			['metadata', 'Metadata', true, {}],
			['mpr', 'MPRAction', true, {}],
			['oblique', 'ObliqueAction', true, {}],
			['status', 'ServerStatus', false, { counter: this.counter }],
		];

		if (config.authorization.require) {
			routes.push([
				'requestToken', 'RequestAccessTokenAction', false,
				{ cache: authorizationCache, allowFrom: config.authorization.allowFrom }
			]);
		}

		routes.forEach(route => {
			var [ routeName, moduleName, needsAuth, deps ] = route;
			logger.info(`Loading ${moduleName} module...`);
			var module: typeof Controller = require(`./controllers/${moduleName}`).default;
			var controller = new module(reader, imageEncoder);
			for (let k in deps) controller[k] = deps[k];

			// If token authorization is required, use this middleware
			if (config.authorization.require && needsAuth) {
				controller = new TokenAuthenticationBridge(
					controller, authorizationCache, reader, imageEncoder);
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