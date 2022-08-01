import fetch, { RequestInfo, RequestInit } from 'node-fetch';

/**
 * @param token - The token to use for authorization.
 * @param endpoint - e.g. 'https://circus-server.net/api/'
 * @returns
 */
const createAuthorizedFetch = (
  token: string,
  endpoint: string
): typeof fetch => {
  if (!token.length || !endpoint.length)
    throw new Error('Invalid token or endpoint');
  return async (resource: RequestInfo, init?: RequestInit) => {
    if (typeof resource === 'string' && !resource.startsWith('http')) {
      resource = endpoint + resource;
    }
    if ('Authorization' in (init?.headers ?? {}))
      throw new Error('Internal error: Authorization header cannot be set');
    try {
      const res = await fetch(resource, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(
          `HTTP error: ${res.status} ${res.statusText}\n` +
            `URL: ${res.url}\n` +
            `Error content: ${await res.text()}`
        );
      }
      return res;
    } catch (err: any) {
      if (err instanceof TypeError) {
        // fetch failed due to a network error, a CORS error, etc.
        throw new Error(
          `HTTP error: ${err.message}\n` +
            `URL: ${resource}` +
            ('cause' in err ? `\nCause: ${(err as any).cause}` : '')
        );
      } else {
        // error with HTTP status code, e.g. 404, 500.
        throw err;
      }
    }
  };
};

export default createAuthorizedFetch;
