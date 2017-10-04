import Koa from 'koa';
import { assert } from 'chai';
import { MongoClient } from 'mongodb';


/**
 * This is a helper module for tests using Koa server.
 * @module
 */

export async function setUpKoa(setUpFunc) {
	const app = new Koa();
	await setUpFunc(app);
	return app;
}

export function listenKoa(koaApp) {
	const port = process.env.API_TEST_PORT || 8081;
	return new Promise((resolve, reject) => {
		const instance = koaApp.listen(port, 'localhost', err => {
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
		return err; // returned as a resolved value to further investigate it
	}
	throw new Error('Server did not throw any error');
}

export async function connectMongo() {
	const url = process.env.MONGO_URL;
	const db = await MongoClient.connect(url);
	return db;
}