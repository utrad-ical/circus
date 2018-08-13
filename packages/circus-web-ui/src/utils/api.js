import axios from 'axios';
import { showMessage } from 'actions';
import * as qs from 'querystring';
import * as Cookies from 'js-cookie';

export const apiServer = '/';

export let apiCaller;

const token = Cookies.get('apiToken');
if (token) createApiCaller(token);

function createApiCaller(token) {
  apiCaller = axios.create({
    baseURL: apiServer + 'api/',
    cached: false,
    withCredentials: true,
    headers: { Authorization: `Bearer ${token}` }
  });
}

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
  const newToken = res.data.access_token;
  Cookies.set('apiToken', newToken);
  createApiCaller(newToken);
}

export async function api(command, options = {}) {
  const params = { url: command, method: 'get', ...options };
  if (typeof params.data === 'object') {
    if (params.method === 'get') params.method = 'post';
  }
  try {
    const res = await apiCaller(params);
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
