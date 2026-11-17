import type { z } from 'zod';
import type { RouteMiddleware } from './typings/middlewares.ts';

type OneOrMore = string | string[];

/**
 * An API route. The handler is defined in `index.ts` in the same directory.
 */
export interface RouteDefinition {
  verb: 'get' | 'put' | 'post' | 'patch' | 'delete';
  path: string;
  handler: RouteMiddleware;
  description?: string;
  requiredGlobalPrivilege?: OneOrMore;
  requiredProjectPrivilege?: OneOrMore;
  requiredPluginPrivilege?: OneOrMore;
  requiredSeriesDomainCheck?: string | boolean;
  /** Registered only when the server runs in the debug mode */
  forDebug?: boolean;
  expectedContentType?: string;
  /** Schema of the request body */
  request?: z.ZodType;
  /** Schema of the response body */
  response?: z.ZodType;
  noAuthentication?: true;
}

/**
 * The routes defined in `routes.ts` of each directory under `api/`.
 */
export interface RouteGroup {
  name: string;
  description?: string;
  routes: RouteDefinition[];
}

export const defineRoute = <T extends RouteDefinition>(route: T): T => route;

export const defineRouteGroup = (group: RouteGroup): RouteGroup => group;
