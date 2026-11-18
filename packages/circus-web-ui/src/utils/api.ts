import { getStore } from '#store/storeAccess.ts';
import { showMessage } from '#store/messages.ts';
import { ApiHttpError } from './apiHttpError.ts';
import type { ApiResponse } from './apiHttpError.ts';
import {
  currentUserEmail,
  expectedUserHeaderName,
  isSessionUserChangedError,
  showSessionUserChangedMessage
} from './sessionUserCheck.ts';

type ErrorHandling = boolean | number[];

interface ApiOptions<Body> {
  method?: string;
  data?: Body;
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: HeadersInit;
  responseType?: 'arraybuffer';
  checkUser?: boolean;
  handleErrors?: ErrorHandling;
}

interface UploadOptions {
  onProgress: (event: ProgressEvent) => void;
  handleErrors?: ErrorHandling;
}

/** The session cookie's CSRF protection requires this header. */
const csrfHeader = 'X-Requested-With';

export const createApiCaller = (apiServer: string) => {
  const baseUrl = apiServer + 'api/';
  const requestUrl = (command: string) =>
    new URL(baseUrl + command.replace(/^\/+/, ''), window.location.href);

  const api = <Result = unknown, Body = unknown>(
    command: string,
    options: ApiOptions<Body> = {},
    signal?: AbortSignal
  ): Promise<Result> => {
    const {
      checkUser = true,
      handleErrors,
      data,
      params,
      responseType,
      method = 'GET'
    } = options;

    return reportApiErrors<Result>(
      async () => {
        const url = requestUrl(command);
        for (const [key, value] of Object.entries(params ?? {})) {
          if (value != null) url.searchParams.append(key, String(value));
        }

        const headers = requestHeaders(checkUser, options.headers);
        const normalizedMethod = method.toUpperCase();
        const requestMethod =
          normalizedMethod === 'GET' && typeof data === 'object'
            ? 'POST'
            : normalizedMethod;
        const response = await fetch(url, {
          method: requestMethod,
          credentials: 'include',
          headers,
          body: requestBody(data, headers),
          signal
        });

        return {
          status: response.status,
          headers: response.headers,
          data:
            responseType === 'arraybuffer'
              ? await response.arrayBuffer()
              : parseApiText(await response.text())
        };
      },
      handleErrors,
      signal
    );
  };

  api.upload = <Result = unknown>(
    command: string,
    form: FormData,
    { onProgress, handleErrors }: UploadOptions
  ): Promise<Result> =>
    reportApiErrors<Result>(
      () =>
        uploadForm(requestUrl(command), requestHeaders(true), form, onProgress),
      handleErrors
    );

  api.getBaseUrl = () => baseUrl;
  return api;
};

const requestHeaders = (checkUser: boolean, overrides?: HeadersInit) => {
  const headers = new Headers({ [csrfHeader]: 'XMLHttpRequest' });
  const userEmail = checkUser ? currentUserEmail() : undefined;
  if (userEmail) headers.set(expectedUserHeaderName, userEmail);
  new Headers(overrides).forEach((value, name) => headers.set(name, value));
  return headers;
};

const requestBody = (data: unknown, headers: Headers): BodyInit | undefined => {
  if (data == null) return undefined;
  if (
    typeof data === 'string' ||
    data instanceof Blob ||
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    data instanceof ArrayBuffer
  ) {
    return data;
  }
  if (ArrayBuffer.isView(data)) return data as ArrayBufferView<ArrayBuffer>;

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return JSON.stringify(data);
};

const parseApiText = (body: string): unknown => {
  if (!body) return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const uploadForm = (
  url: URL,
  headers: Headers,
  form: FormData,
  onProgress: UploadOptions['onProgress']
) =>
  new Promise<ApiResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    headers.forEach((value, name) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = onProgress;
    xhr.onerror = () => reject(new Error('Network Error'));
    xhr.onabort = () =>
      reject(new DOMException('Request aborted', 'AbortError'));
    xhr.onload = () => {
      const responseHeaders = new Headers();
      for (const line of xhr.getAllResponseHeaders().split('\r\n')) {
        const colon = line.indexOf(':');
        if (colon > 0) {
          responseHeaders.append(line.slice(0, colon), line.slice(colon + 1));
        }
      }
      resolve({
        status: xhr.status,
        headers: responseHeaders,
        data: parseApiText(xhr.responseText)
      });
    };
    xhr.send(form);
  });

const reportApiErrors = async <Result>(
  send: () => Promise<ApiResponse>,
  handleErrors?: ErrorHandling,
  signal?: AbortSignal
): Promise<Result> => {
  try {
    const response = await send();
    if (response.status < 200 || response.status >= 300) {
      throw new ApiHttpError(response);
    }
    return response.data as Result;
  } catch (err) {
    if (
      signal?.aborted ||
      (err instanceof DOMException && err.name === 'AbortError')
    ) {
      throw err;
    }
    if (isSessionUserChangedError(err)) {
      showSessionUserChangedMessage();
    } else {
      const status =
        err instanceof ApiHttpError ? err.response.status : undefined;
      const handled =
        handleErrors === true ||
        (Array.isArray(handleErrors) &&
          status !== undefined &&
          handleErrors.includes(status));
      if (!handled) showErrorMessage(status);
    }
    throw err;
  }
};

const showErrorMessage = (status?: number) => {
  const messages: Record<number, string> = {
    400: 'Bad request.',
    404: 'Not found.',
    401: 'Authorization error. Please log-in again.',
    500: 'Internal server error occurred. Please consult the administrator.'
  };
  const message =
    status === undefined
      ? 'The server did not respond.'
      : (messages[status] ??
        `Unknown server error (${status}). Please consult the administrator.`);
  getStore().dispatch(
    showMessage(message, 'danger', {
      tag: 'apiResult',
      dismissOnPageChange: true
    })
  );
};

/** The CIRCUS API accessor, authenticated with the HttpOnly session cookie. */
export const api = createApiCaller('/');
