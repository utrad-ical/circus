import NodeOAuthServer, { Request, Response } from 'oauth2-server';

/**
 * Simple wrapper for node-oauth2-server.
 */
export default class KoaOAuth2Server {
	constructor(options = {}) {
		if (!options.model) {
			throw new TypeError('Missing parameter: `model`');
		}
		this.server = new NodeOAuthServer(options);
	}

	handleResponse(ctx, response) {
		if (response.status === 302) {
			const location = response.headers.location;
			delete response.headers.location;
			ctx.set(response.headers);
			ctx.redirect(location);
		} else {
			ctx.set(response.headers);
			ctx.status = response.status;
			ctx.body = response.body;
		}
	}

	authenticate(options) {
		return async (ctx, next) => {
			const request = new Request(ctx.request);
			const response = new Response(ctx.response);
			const token = await this.server.authenticate(request, response, options);
			ctx.state.oauth = { token };
			await next();
		};
	}

	authorize(options) {
		return async (ctx, next) => {
			const request = new Request(ctx.request);
			const response = new Response(ctx.request);
			const code = await this.server.authorize(request, response, options);
			ctx.state.oauth = { code };
			this.handleResponse(ctx, response);
		};
	}

	token(options) {
		return async (ctx, next) => {
			const request = new Request(ctx.request);
			const response = new Response(ctx.response);
			const token = await this.server.token(request, response, options);
			ctx.state.oauth = { token };
			this.handleResponse(ctx, response);
		};
	}

}

