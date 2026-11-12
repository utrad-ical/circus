import NodeOAuthServer, { Request, Response } from 'oauth2-server';
import status from 'http-status';
import type koa from 'koa';

/**
 * Simple wrapper for node-oauth2-server.
 */
export default class KoaOAuth2Server {
  private server: NodeOAuthServer;
  private options: any;

  constructor(options: any) {
    if (!options.model) {
      throw new TypeError('Missing parameter: `model`');
    }
    this.server = new NodeOAuthServer(options);
    this.options = options;
  }

  handleResponse(ctx: koa.Context, response: any) {
    if (response.status === status.FOUND) {
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

  /**
   * Verifies the credentials in the same way as the password grant
   * (including onetime passwords), and returns the user or null.
   */
  async verifyUser(username: string, password: string): Promise<any | null> {
    return await this.options.model.getUser(username, password);
  }

  authenticate(options?: any): koa.Middleware {
    return async (ctx, next) => {
      const request = new Request(ctx.request);
      const response = new Response(ctx.res);
      const token = await this.server.authenticate(request, response, options);
      ctx.state.oauth = { token, user: token.user };
      for (const k in token.user) {
        ctx[k] = token.user[k];
      }
      await next();
    };
  }

  authorize(options?: any): koa.Middleware {
    return async (ctx, next) => {
      const request = new Request(ctx.request);
      const response = new Response(ctx.res);
      const code = await this.server.authorize(request, response, options);
      ctx.state.oauth = { code };
      this.handleResponse(ctx, response);
    };
  }

  token(options?: any): koa.Middleware {
    return async (ctx, next) => {
      const request = new Request(ctx.request);
      const response = new Response(ctx.res);
      const token = await this.server.token(request, response, options);
      ctx.state.oauth = { token };
      if (typeof this.options.onTokenIssue === 'function') {
        await this.options.onTokenIssue.call(null, ctx, token);
      }
      this.handleResponse(ctx, response);
    };
  }
}
