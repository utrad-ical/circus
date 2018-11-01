import axios from 'axios';
import { showMessage } from 'actions';
import * as qs from 'querystring';

export const apiServer = '/';

export let api;

function restoreApiCaller() {
  const credentials = sessionStorage.getItem('tokenCredentials');
  if (credentials) api = createApiCaller(JSON.parse(credentials));
}

restoreApiCaller();

function createApiCaller(credentials) {
  return async function api(command, options = {}) {
    const params = { url: command, method: 'get', ...options };
    if (typeof params.data === 'object') {
      if (params.method === 'get') params.method = 'post';
    }

    if (Date.now() > credentials.expiresAt - 60000) {
      credentials = await tryRefreshToken(credentials.refreshToken);
    }

    try {
      const res = await axios({
        baseURL: apiServer + 'api/',
        cached: false,
        withCredentials: true,
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        ...params
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
}

function saveCredentialData(res) {
  const credentials = {
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
    expiresIn: res.data.expires_in,
    expiresAt: Date.now() + res.data.expires_in * 1000
  };
  sessionStorage.setItem('tokenCredentials', JSON.stringify(credentials));
  return credentials;
}

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
  createApiCaller(newCredentials);
  return newCredentials;
};

export async function tryAuthenticate(id, password) {
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
}

function showErrorMessage(err) {
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
}
