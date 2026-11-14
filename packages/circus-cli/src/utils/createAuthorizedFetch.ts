import createSpinner from './createSpinner.ts';

export type AuthorizedFetch = (
  resource: string,
  init?: RequestInit
) => Promise<Response>;

/**
 * @param token - The token to use for authorization.
 * @param endpoint - e.g. 'https://circus-server.net/api/'
 * @returns
 */
const createAuthorizedFetch = (
  token: string,
  endpoint: string
): AuthorizedFetch => {
  if (!token.length || !endpoint.length)
    throw new Error('Invalid token or endpoint');
  return async (resource, init) => {
    if (!resource.startsWith('http')) {
      resource = endpoint + resource;
    }
    const headers = new Headers(init?.headers);
    if (headers.has('Authorization'))
      throw new Error('Internal error: Authorization header cannot be set');
    headers.set('Authorization', `Bearer ${token}`);
    try {
      const res = await fetch(resource, { ...init, headers });
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
            ('cause' in err ? `\nCause: ${err.cause}` : '')
        );
      } else {
        // error with HTTP status code, e.g. 404, 500.
        throw err;
      }
    }
  };
};

export const fetchWithSpinner = async (
  fetchInstance: AuthorizedFetch,
  message: string,
  url: string,
  init?: RequestInit
) => {
  const spinner = createSpinner(message + '...');
  let isError = false;
  try {
    try {
      const res = await fetchInstance(url, init);
      return res;
    } catch (err) {
      isError = true;
      throw err;
    }
  } finally {
    spinner.stop(isError ? `${message}: Error` : `${message}: Done`, isError);
  }
};

export default createAuthorizedFetch;
