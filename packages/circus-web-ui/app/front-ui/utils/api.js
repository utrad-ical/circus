import axios from 'axios';

export const api = (command, options = {}) => {
	const params = {
		method: 'get',
		url: '/api/' + command,
		cached: false,
	};
	for (let k in options) {
		params[k] = options[k];
	};
	if (typeof params.data === 'object') {
		if (params.method === 'get') params.method = 'post';
		params.headers = { 'Content-Type': 'application/json' };
		params.data = JSON.stringify(params.data);
	}
	return axios(params).then(res => res.data);
};
