import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

export type TestQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

interface TestRequestOptions {
  headers?: HeadersInit;
  params?: TestQueryParams;
  responseType?: 'arraybuffer' | 'stream';
}

interface TestRequest extends TestRequestOptions {
  url: string;
  method?: string;
  data?: unknown;
}

export const createTestHttpClient = (
  baseUrl: string,
  defaultHeaders?: HeadersInit
) => {
  const request = async ({
    url,
    method = 'GET',
    data,
    headers: requestHeaders,
    params,
    responseType
  }: TestRequest) => {
    const target = new URL(url, baseUrl);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value != null) target.searchParams.append(key, String(value));
    }

    const headers = new Headers(defaultHeaders);
    new Headers(requestHeaders).forEach((value, key) =>
      headers.set(key, value)
    );
    let body: BodyInit | undefined;
    if (data instanceof Readable) {
      body = Readable.toWeb(data) as ReadableStream;
    } else if (
      typeof data === 'string' ||
      data instanceof FormData ||
      data instanceof URLSearchParams ||
      data instanceof Blob ||
      data instanceof ArrayBuffer ||
      ArrayBuffer.isView(data)
    ) {
      body = data as BodyInit;
    } else if (data !== undefined) {
      body = JSON.stringify(data);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }

    const response = await fetch(target, {
      method: method.toUpperCase(),
      body,
      headers,
      ...(data instanceof Readable ? { duplex: 'half' } : {})
    });
    return {
      status: response.status,
      headers: response.headers,
      data: await readTestResponse(response, responseType)
    };
  };

  return {
    request,
    get: (url: string, options?: TestRequestOptions) =>
      request({ url, method: 'GET', ...options }),
    delete: (url: string, options?: TestRequestOptions) =>
      request({ url, method: 'DELETE', ...options }),
    post: (url: string, data: unknown, options?: TestRequestOptions) =>
      request({ url, method: 'POST', data, ...options }),
    patch: (url: string, data: unknown, options?: TestRequestOptions) =>
      request({ url, method: 'PATCH', data, ...options }),
    put: (url: string, data: unknown, options?: TestRequestOptions) =>
      request({ url, method: 'PUT', data, ...options })
  };
};

export type TestHttpClient = ReturnType<typeof createTestHttpClient>;

async function readTestResponse(
  response: Response,
  responseType: TestRequestOptions['responseType']
): Promise<any> {
  switch (responseType) {
    case 'arraybuffer':
      return response.arrayBuffer();
    case 'stream':
      if (!response.body) throw new Error('Expected a response stream');
      return Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>);
    default: {
      const text = await response.text();
      return text &&
        response.headers.get('Content-Type')?.includes('application/json')
        ? JSON.parse(text)
        : text;
    }
  }
}
