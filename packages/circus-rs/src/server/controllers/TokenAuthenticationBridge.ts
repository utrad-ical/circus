import Controller from './Controller';
import * as express from 'express';
import { STATUS_CODES } from 'http';
import ImageEncoder from '../image-encoders/ImageEncoder';
import AsyncLruCache from '../../common/AsyncLruCache';
import RawData from '../../common/RawData';
import AuthorizationCache from '../AuthorizationCache';

/**
 * This is a special controller which handles token authorization.
 */
export default class TokenAuthenticationBridge extends Controller {
	private actualController: Controller;
	private authorizationCache: AuthorizationCache;

	constructor(actualController: Controller, authorizationCache: AuthorizationCache,
		reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder
	) {
		super(reader, imageEncoder);
		this.authorizationCache = authorizationCache;
		this.actualController = actualController;
	}

	public execute(req: express.Request, res: express.Response): void {
		if (!this.authorizationCache.isValid(req)) {
			res.setHeader('WWW-Authenticate', 'Bearer realm="CircusRS"');
			res.writeHead(401, STATUS_CODES[401]);
			res.write('Access denied.');
			res.end();
			return;
		}
		this.actualController.execute(req, res);
	}

}
