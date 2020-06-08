import axios, { AxiosResponse } from 'axios';
import { CancelToken } from './cancelToken';
import { showMessage } from 'actions';
import * as qs from 'querystring';
import { useContext, createContext } from 'react';

interface ApiCaller {
  (command: string, options?: any, cancelToken?: CancelToken): Promise<any>;
}

export let api: ApiCaller; // TODO: eventually remove this in favor of context

/**
 * Forms a credential data from an Axios OAuth response.
 * @param res Axios response
 */
export const formatCredentials = (responseData: any) => ({
  accessToken: responseData.access_token,
  refreshToken: responseData.refresh_token,
  expiresIn: responseData.expires_in,
  expiresAt: Date.now() + responseData.expires_in * 1000
});

/**
 * Creates CIRCUS API accessor.
 */
const createApiCaller = (initialCredentials: any, apiServer: string) => {
  let credentials = initialCredentials;

  const saveCredentialData = (credentials: any) => {
    sessionStorage.setItem('tokenCredentials', JSON.stringify(credentials));
  };

  const tryRefreshToken = async (refreshToken: string) => {
    const res = await axios.request({
      method: 'post',
      url: apiServer + 'login',
      data: qs.stringify({
        client_id: 'circus-front',
        client_secret: 'not-a-secret',
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
    saveCredentialData(formatCredentials(res.data));
    return formatCredentials(res.data);
  };

  api = async (command: string, options = {}, cancelToken?: CancelToken) => {
    const params: any = { url: command, method: 'get', ...options };
    if (typeof params.data === 'object') {
      if (params.method === 'get') params.method = 'post';
    }

    if (Date.now() > credentials.expiresAt - 60000) {
      credentials = await tryRefreshToken(credentials.refreshToken);
    }

    try {
      const headers = {
        Authorization: `Bearer ${credentials.accessToken}`,
        ...(params.headers || {})
      };

      let axiosCancelToken = undefined;
      if (cancelToken) {
        const source = axios.CancelToken.source();
        cancelToken.onCancel(() => source.cancel());
        axiosCancelToken = source.token;
      }

      const res = await axios({
        baseURL: apiServer + 'api/',
        cached: false,
        withCredentials: true,
        ...params,
        headers,
        cancelToken: axiosCancelToken
      });
      return res.data;
    } catch (err) {
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
  saveCredentialData(credentials);
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
  showMessage(message, 'danger', {
    tag: 'apiResult',
    dismissOnPageChange: true
  });
};

export default createApiCaller;

export const ApiContext = createContext<ApiCaller | undefined>(undefined);

export const useApi = () => {
  return useContext(ApiContext)!;
};
