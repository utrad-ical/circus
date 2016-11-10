import logger, { shutdown as loggerShutdown } from './Logger';
logger.info('================================');
logger.info('CIRCUS RS is starting up...');

import Counter from './Counter';
import ImageEncoder from './image-encoders/ImageEncoder';

import DicomVolume from '../common/DicomVolume';
import AsyncLruCache from '../common/AsyncLruCache';

import DicomDumper from './dicom-dumpers/DicomDumper';
import DicomFileRepository from './dicom-file-repository/DicomFileRepository';
import AuthorizationCache from './AuthorizationCache';
import TokenAuthenticationBridge from './controllers/TokenAuthenticationBridge';
import Controller from './controllers/Controller';

import * as http from 'http';
import * as express from 'express';
import { Configuration } from './Configuration';

/**
 * Main server class.
 */
export default class Server {
	// injected modules

	protected imageEncoder: ImageEncoder;
	protected dicomFileRepository: DicomFileRepository;
	protected dicomDumper: DicomDumper;

	public counter: Counter;
	protected express: express.Application;
	protected server: http.Server;
	protected config: Configuration;
	protected dicomReader: AsyncLruCache<DicomVolume>;
	public loadedModuleNames: string[] = [];

	constructor(
		imageEncoder: ImageEncoder,
		dicomFileRepository: DicomFileRepository,
		dicomDumper: DicomDumper,
		config: Configuration
	) {
		this.imageEncoder = imageEncoder;
		this.loadedModuleNames.push((imageEncoder.constructor as any).name); // 'name' is ES6 feature
		this.dicomFileRepository = dicomFileRepository;
		this.loadedModuleNames.push((dicomFileRepository.constructor as any).name);
		this.dicomDumper = dicomDumper;
		this.loadedModuleNames.push((dicomDumper.constructor as any).name);
		this.config = config;
		this.counter = new Counter();
	}

	public getServer(): http.Server {
		return this.server;
	}

	public start(): void {
		// prepare routing
		try {
			// create server process
			this.express = express();
			this.express.locals.counter = this.counter;
			this.express.locals.loadedModuleNames = this.loadedModuleNames;
			this.prepareRouter();
			this.server = this.express.listen(this.config.port, () => {
				logger.info('Server running on port ' + this.config.port);
			});
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

	private createDicomReader(): AsyncLruCache<DicomVolume> {
		return new AsyncLruCache<DicomVolume>(
			seriesUID => {
				return this.dicomFileRepository.getSeriesLoader(seriesUID)
					.then(loaderInfo => this.dicomDumper.readDicom(loaderInfo, 'all'));
			},
			{
				maxSize: this.config.cache.memoryThreshold,
				sizeFunc: (r): number => r.dataSize
			}
		);
	}

	private prepareRouter(): void {
		const config = this.config;
		this.dicomReader = this.createDicomReader();
		const authorizationCache = new AuthorizationCache(config.authorization);
		this.express.locals.authorizationCache = authorizationCache;

		// path name, process class name, needs token authorization
		const routes: [string, string, boolean][] = [
			['metadata', 'Metadata', true],
			['scan', 'ObliqueScan', true],
			['volume', 'VolumeAction', true],
			['status', 'ServerStatus', false]
		];

		if (config.authorization.require) {
			routes.push(['requestToken', 'RequestAccessTokenAction', false]);
		}

		routes.forEach(route => {
			const [routeName, moduleName, needsAuth] = route;
			logger.info(`Loading ${moduleName} module...`);
			const module: typeof Controller = require(`./controllers/${moduleName}`).default;
			let controller = new module(this.dicomReader, this.imageEncoder);

			// If token authorization is required, use this middleware
			if (config.authorization.require && needsAuth) {
				controller = new TokenAuthenticationBridge(
					controller, authorizationCache, this.dicomReader, this.imageEncoder);
			}

			this.express.get('/' + routeName, (req, res) => {
				this.counter.countUp(routeName);
				controller.execute(req, res);
			});
			// CrossOrigin Resource Sharing http://www.w3.org/TR/cors/
			this.express.options('/' + routeName, (req, res) => {
				controller.options(req, res);
			});
		});
	}
}
