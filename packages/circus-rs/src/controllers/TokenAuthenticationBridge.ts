import Controller from './Controller';
import http = require('http');
import ImageEncoder from '../image-encoders/ImageEncoder';
import AsyncLruCache from '../AsyncLruCache';
import RawData from '../RawData';
import AuthorizationCache from '../AuthorizationCache';

/**
 * This is a special controller which handles token authorization.
 */
export default class TokenAuthenticationBridge extends Controller {
	private actualController: Controller;
	private authorizationCache: AuthorizationCache;

	constructor(actualController: Controller, authorizationCache: AuthorizationCache,
				reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder)
	{
		super(reader, imageEncoder);
		this.authorizationCache = authorizationCache;
		this.actualController = actualController;
	}

	public execute(req: http.ServerRequest, res: http.ServerResponse): void
	{
		if (!this.authorizationCache.isValid(req)) {
			res.setHeader('WWW-Authenticate', 'Bearer realm="CircusRS"');
			res.writeHead(401, http.STATUS_CODES[401]);
			res.write('Access denied.');
			res.end();
			return;
		}
		this.actualController.execute(req, res);
	}

}
