import Koa from 'koa';
import { assert } from 'chai';

export function setUpKoa(setUpFunc) {
	const port = process.env.API_TEST_PORT || 8081;
	const app = new Koa();
	return setUpFunc(app).then(() => {
		return new Promise((resolve, reject) => {
			const instance = app.listen(port, 'localhost', err => {
				if (err) {
					reject(err);
				} else {
					resolve({
						url: `http://localhost:${port}/`,
						instance
					});
				}
			});
		});
	});
}

export function tearDownKoa(server) {
	return new Promise((resolve, reject) => {
		if (server.instance) {
			server.instance.close(
				err => { err ? reject() : resolve(); }
			);
		} else resolve();
	});
}

export async function serverThrowsWithState(promise, status, pattern) {
	try {
		await promise;
	} catch (err) {
		assert.equal(err.response.status, status);
		if (pattern) {
			assert.match(err.response.data.error, pattern);
		}
		return;
	}
	throw new Error('Server did not throw an error');
}