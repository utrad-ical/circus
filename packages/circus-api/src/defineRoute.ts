import type { z } from 'zod';
import type { RouteMiddleware } from './typings/middlewares.ts';

type OneOrMore = string | string[];

/**
 * The metadata of an API route.
 * It is bound to its handler in `defineRouteGroup()` with `route()`.
 */
export interface RouteDefinition {
  verb: 'get' | 'put' | 'post' | 'patch' | 'delete';
  path: string;
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

/** A route bound to its handler */
export interface BoundRoute extends RouteDefinition {
  handler: RouteMiddleware<any>;
}

/**
 * The routes defined in `routes.ts` of each directory under `api/`.
 */
export interface RouteGroup {
  name: string;
  description?: string;
  routes: BoundRoute[];
}

export const defineRoute = <T extends RouteDefinition>(route: T): T => route;

/** Binds a route to its handler, which is typed with the route */
export const route = <R extends RouteDefinition>(
  definition: R,
  handler: RouteMiddleware<R>
): BoundRoute => ({ ...definition, handler });

export const defineRouteGroup = (group: RouteGroup): RouteGroup => group;
