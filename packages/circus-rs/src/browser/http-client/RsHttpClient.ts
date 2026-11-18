type ResponseType =
  | 'arraybuffer'
  | 'blob'
  | 'document'
  | 'json'
  | 'text'
  | 'stream'
  | 'formdata';

/**
 * Simple HTTP wrapper that connects to the CIRCUS RS server and returns the response
 * in the appropriate format.
 */
export default class RsHttpClient {
  private host: string;
  private token: string | undefined;

  constructor(host = 'http://localhost:3000', token?: string) {
    this.host = host;
    this.token = token;
  }

  public async request(
    command: string,
    params: unknown,
    responseType: ResponseType = 'json',
    abortSignal?: AbortSignal
  ): Promise<any> {
    const path = `${this.host.replace(/\/+$/, '')}/${command.replace(/^\/+/, '')}`;
    const url = new URL(path, globalThis.location?.href);
    if (params instanceof URLSearchParams) {
      params.forEach((value, key) => url.searchParams.append(key, value));
    } else if (params != null) {
      if (typeof params !== 'object')
        throw new TypeError('Expected query parameters');
      for (const [key, value] of Object.entries(params)) {
        appendQueryParameter(url.searchParams, key, value);
      }
    }

    const headers = new Headers();
    if (typeof this.token === 'string') {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    const response = await fetch(url, { headers, signal: abortSignal });
    const data = await readResponse(response, responseType);
    if (!response.ok) {
      throw new RsHttpError(response, data);
    }
    return data;
  }
}

class RsHttpError extends Error {
  readonly response: { status: number; data: unknown; headers: Headers };

  constructor(response: Response, data: unknown) {
    super(`Request failed with status code ${response.status}`);
    this.name = 'RsHttpError';
    this.response = {
      status: response.status,
      headers: response.headers,
      data
    };
  }
}

const appendQueryParameter = (
  query: URLSearchParams,
  key: string,
  value: unknown,
  nested = false
): void => {
  if (value == null) return;
  if (value instanceof Date) {
    query.append(key, value.toISOString());
  } else if (
    Array.isArray(value) &&
    !nested &&
    value.every(item => item === null || typeof item !== 'object')
  ) {
    const arrayKey = key.endsWith('[]') ? key : key + '[]';
    for (const item of value) appendQueryParameter(query, arrayKey, item, true);
  } else if (typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) {
      appendQueryParameter(query, `${key}[${childKey}]`, child, true);
    }
  } else {
    query.append(key, String(value));
  }
};

const readResponse = async (response: Response, type: ResponseType) => {
  if (type === 'arraybuffer') return response.arrayBuffer();
  if (type === 'blob') return response.blob();

  const text = await response.text();
  if (type === 'json' && text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  if (type === 'document') {
    const mime = response.headers
      .get('Content-Type')
      ?.split(';')[0]
      .trim()
      .toLowerCase();
    if (typeof DOMParser === 'undefined') return null;
    const parser = new DOMParser();
    if (mime === 'text/html') return parser.parseFromString(text, 'text/html');
    if (
      mime === 'text/xml' ||
      mime === 'application/xml' ||
      mime?.endsWith('+xml')
    ) {
      const document = parser.parseFromString(text, 'application/xml');
      return document.getElementsByTagName('parsererror').length
        ? null
        : document;
    }
    return null;
  }
  // The old browser client handled the stream and formdata modes as text.
  return text;
};
