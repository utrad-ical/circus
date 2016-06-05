import axios from 'axios';
import { showMessage } from 'actions';

export async function api(command, options = {}) {
	const params = {
		method: 'get',
		url: '/api/' + command,
		cached: false
	};
	for (let k in options) {
		params[k] = options[k];
	};
	if (typeof params.data === 'object') {
		if (params.method === 'get') params.method = 'post';
		params.headers = { 'Content-Type': 'application/json' };
		params.data = JSON.stringify(params.data);
	}
	try {
		const res = await axios(params);
		return res.data;
	} catch (err) {
		if (!params.silent) {
			showMessage(err.toString(), 'danger');
		}
		throw err;
	}
};
