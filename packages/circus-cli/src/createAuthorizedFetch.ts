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
  return async (resource: RequestInfo | URL, init?: RequestInit) => {
    if (typeof resource === 'string' && !resource.startsWith('http')) {
      resource = endpoint + resource;
    }
    if ('Authorization' in (init?.headers ?? {}))
      throw new Error('Internal error: Authorization header cannot be set');
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
  };
};

export default createAuthorizedFetch;
