import type { AxiosResponse } from 'axios';
import axios from 'axios';
import type { CancelToken } from './cancelToken.ts';
import { dispatch } from '#store/index.ts';
import { showMessage } from '#store/messages.ts';
import { useContext, createContext } from 'react';

export interface ApiCaller {
  (command: string, options?: any, cancelToken?: CancelToken): Promise<any>;
  getBaseUrl: () => string;
}

/**
 * The header required by the API server for requests that may change data
 * (CSRF protection for the session cookie).
 */
export const csrfHeaders = { 'X-Requested-With': 'XMLHttpRequest' };

/**
 * Creates CIRCUS API accessor.
 * Requests are authenticated with the HttpOnly session cookie,
 * which the browser sends automatically.
 */
const createApiCaller = (apiServer: string) => {
  const baseURL = apiServer + 'api/';

  const api: ApiCaller = async (
    command: string,
    options = {},
    cancelToken?: CancelToken
  ) => {
    const params: any = { url: command, method: 'get', ...options };
    if (typeof params.data === 'object') {
      if (params.method === 'get') params.method = 'post';
    }

    try {
      const headers = { ...csrfHeaders, ...(params.headers || {}) };

      let axiosCancelToken = undefined;
      if (cancelToken) {
        const source = axios.CancelToken.source();
        cancelToken.onCancel(() => source.cancel());
        axiosCancelToken = source.token;
      }

      const res = await axios({
        baseURL,
        cached: false,
        withCredentials: true,
        ...params,
        headers,
        cancelToken: axiosCancelToken
      });
      return res.data;
    } catch (err: any) {
      // By default, all errors are displayed with a minimal message.
      // Set 'handleErrors' option to supress error message for specific error types.
      let handle = options.handleErrors === true;
      if (
        err.response &&
        Array.isArray(options.handleErrors) &&
        options.handleErrors.indexOf(err.response.status) > -1
      ) {
        handle = true;
      }
      if (!handle) {
        showErrorMessage(err);
      }
      throw err;
    }
  };
  api.getBaseUrl = () => baseURL;
  return api;
};

const showErrorMessage = (err: { response: AxiosResponse }) => {
  let message = '';

  if (err.response && typeof err.response.status === 'number') {
    const status = err.response.status;
    const messages: { [status: number]: string } = {
      400: 'Bad request.',
      404: 'Not found.',
      401: 'Authorization error. Please log-in again.',
      500: 'Internal server error occurred. Please consult the administrator.'
    };
    if (status in messages) {
      message = messages[status];
    } else {
      message = `Unknown server error (${status}). Please consult the administrator.`;
    }
  } else {
    message = 'The server did not respond.';
  }
  dispatch(
    showMessage(message, 'danger', {
      tag: 'apiResult',
      dismissOnPageChange: true
    })
  );
};

export default createApiCaller;

export const ApiContext = createContext<ApiCaller | undefined>(undefined);

export const useApi = () => {
  return useContext(ApiContext)!;
};
