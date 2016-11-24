import Logger from '../loggers/Logger';
import ImageEncoder from '../image-encoders/ImageEncoder';
import * as express from 'express';
import AsyncLruCache from '../../common/AsyncLruCache';
import RawData from '../../common/RawData';
import { ValidatorRules } from '../../common/Validator';
import { validate } from './Middleware';

/**
 * Base DICOM Server controller.
 */
export default class Controller {

	protected logger: Logger;
	protected reader: AsyncLruCache<RawData>;
	protected imageEncoder: ImageEncoder;

	constructor(logger: Logger, reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder) {
		this.logger = logger;
		this.reader = reader;
		this.imageEncoder = imageEncoder;
	}

	public middleware(
		logger: Logger, reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder
	): express.Handler[] {
		return [
			validate(this.getRules()),
			this.process.bind(this)
		];
	}

	public options(req: express.Request, res: express.Response, next: express.NextFunction): void {
		res.status(200);
		res.setHeader('Access-Control-Allow-Methods', 'GET');
		res.setHeader('Access-Control-Allow-Headers', 'Authorization');
		res.end();
	}

	protected process(req: express.Request, res: express.Response, next: express.NextFunction): void {
		// abstract
	}

	protected getRules(): ValidatorRules {
		return {};
	}

}
