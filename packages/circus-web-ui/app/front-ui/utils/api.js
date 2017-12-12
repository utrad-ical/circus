import axios from 'axios';
import { showMessage } from 'actions';
import * as qs from 'querystring';

export const apiServer = 'http://localhost:8080/';

export let apiCaller;

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
	const token = res.data.access_token;
	apiCaller = axios.create({
		baseURL: apiServer + 'api/',
		cached: false,
		withCredentials: true,
		headers: { Authorization: `Bearer ${token}` }
	});
}

export async function api(command, options = {}) {
	const params = { method: 'get', url: command, ...options };
	if (typeof params.data === 'object') {
		if (params.method === 'get') params.method = 'post';
	}
	try {
		const res = await apiCaller(params);
		return res.data;
	} catch (err) {
		// By default, all errors are displayed with a minimal message.
		// Set 'handleErrors' option to supress error message for specific error types.
		let handle = params.handleErrors === true;
		if (Array.isArray(params.handleErrors) && params.handleErrors.indexOf(err.status) > -1) {
			handle = true;
		}
		if (handle) {
			throw err;
		} else {
			showErrorMessage(err);
		}
	}
}

function showErrorMessage(err) {
	let message = '';

	if (typeof err.status === 'number') {
		const messages = {
			400: 'Bad request.',
			404: 'Not found.',
			401: 'Authorization error. Please log-in again.',
			500: 'Internal server error occurred. Please consult the administrator.'
		};
		if (err.status in messages) {
			message = messages[err.status];
		} else {
			message = `Unknown server error (${err.status}). Please consult the administrator.`;
		}
	} else {
		message = 'The server did not respond.';
	}
	showMessage(message, 'danger', { dismissOnPageChange: true });
}
