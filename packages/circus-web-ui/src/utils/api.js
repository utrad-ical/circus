import axios from 'axios';
import { showMessage } from 'actions';
import * as qs from 'querystring';
import React, { useContext } from 'react';

export let api; // TODO: eventually remove this in favor of context

const createApiManager = (apiServer, dispatch, onApiCreated) => {
  api = null;

  const createApiCaller = initialCredentials => {
    let credentials = initialCredentials;
    const api = async (command, options = {}) => {
      const params = { url: command, method: 'get', ...options };
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
        const res = await axios({
          baseURL: apiServer + 'api/',
          cached: false,
          withCredentials: true,
          ...params,
          headers
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
    onApiCreated();
    return api;
  };

  const restoreApiCaller = () => {
    const credentials = sessionStorage.getItem('tokenCredentials');
    if (credentials) api = createApiCaller(JSON.parse(credentials));
  };

  const tryAuthenticate = async (id, password) => {
    const res = await axios.request({
      method: 'post',
      url: apiServer + 'login',
      data: qs.stringify({
        client_id: 'circus-front',
        client_secret: 'not-a-secret',
        grant_type: 'password',
        username: id,
        password
      })
    });
    const credentials = saveCredentialData(res);
    api = createApiCaller(credentials);
  };

  const saveCredentialData = res => {
    const credentials = {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
      expiresAt: Date.now() + res.data.expires_in * 1000
    };
    sessionStorage.setItem('tokenCredentials', JSON.stringify(credentials));
    return credentials;
  };

  const tryRefreshToken = async refreshToken => {
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
    const newCredentials = saveCredentialData(res);
    return newCredentials;
  };

  const showErrorMessage = err => {
    let message = '';

    if (err.response && typeof err.response.status === 'number') {
      const status = err.response.status;
      const messages = {
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
    showMessage(message, 'danger', { dismissOnPageChange: true });
  };

  /**
   * Loads the user information.
   */
  const refreshUserInfo = async (full = false) => {
    dispatch({ type: 'REQUEST_LOGIN_INFO' });
    let result;
    try {
      result = await api('login-info' + (full ? '/full' : ''), {
        handleErrors: [401]
      });
      if (typeof result.userEmail !== 'string') {
        throw Error('Server did not respond with valid user data');
      }
      if (full) {
        dispatch({ type: 'LOAD_FULL_LOGIN_INFO', loginUser: result });
      } else {
        dispatch({ type: 'CONFIRM_LOGIN_INFO' });
      }
    } catch (err) {
      dispatch({ type: 'LOGGED_OUT' });
    }
  };

  const logout = async () => {
    await api('logout');
    dispatch({ type: 'LOGGED_OUT' });
    sessionStorage.removeItem('tokenCredentials');
  };

  return {
    restoreApiCaller,
    tryAuthenticate,
    refreshUserInfo,
    logout,
    api
  };
};

export default createApiManager;

export const ApiContext = React.createContext();
export const ApiManagerContext = React.createContext();

export const useApi = () => {
  return useContext(ApiContext);
};

export const useApiManager = () => {
  return useContext(ApiManagerContext);
};
