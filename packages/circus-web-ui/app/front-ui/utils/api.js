import Promise from 'es6-promise';
import axios from 'axios';

export const api = (command, options = {}) => {
	const params = {
		method: 'get',
		url: '/api/' + command,
		cached: false,
	};
	Object.keys(options).forEach(k => {
		params[k] = options[k];
	});
	if (typeof params.data === 'object') {
		params.method = 'post';
		params.headers = { 'Content-Type': 'application/json' };
		params.data = JSON.stringify(params.data);
	}
	return axios(params).then(res => res.data);
};
