import Koa from 'koa';
import { assert } from 'chai';
import { MongoClient } from 'mongodb';
import * as fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import * as path from 'path';
import EJSON from 'mongodb-extended-json';
import createApp from '../src/createApp';
import createLogger from '../src/createLogger';
import * as qs from 'querystring';
import * as axios from 'axios';

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
				err => { err ? reject(err) : resolve(); }
			);
		} else resolve();
	});
}

export async function setUpAppForTest(logLevel = 'off') {
	const db = await connectMongo();
	await setUpMongoFixture(
		db,
		['series', 'clinicalCases', 'groups', 'projects', 'users', 'tokens']
	);
	const logger = createLogger(logLevel);
	const app = await createApp({ debug: true, db, logger });
	const server = await listenKoa(app);
	const aliceToken = '2311aee0435c36ae14c39835539a931a6344714a';
	const aliceAxios = axios.create({ headers: { Authorization: `Bearer ${aliceToken}` } });
	const bobToken = '8292766837c1901b0a6954f7bda49710316c57da';
	const bobAxios = axios.create({ headers: { Authorization: `Bearer ${bobToken}` } });
	return { db, app, aliceAxios, bobAxios, ...server };
}

export async function tearDownAppForTest(testServer) {
	await tearDownKoa(testServer);
	if (testServer.db) await testServer.db.close();
}

export async function serverThrowsWithState(promise, status, pattern) {
	try {
		await promise;
	} catch (err) {
		assert.exists(err.response, 'Server did not respond');
		assert.equal(err.response.status, status);
		if (pattern) {
			assert.match(err.response.data.error, pattern);
		}
		return err; // returned as a resolved value to further investigate it
	}
	throw new Error('Server did not throw any error');
}

export async function asyncThrows(funcOrPromise, type) {
	try {
		await (funcOrPromise instanceof Promise ? funcOrPromise : funcOrPromise());
	} catch(err) {
		if (type) {
			assert.instanceOf(err, type);
		}
		return;
	}
	throw new Error('Function did not throw any error');
}

export async function connectMongo() {
	const url = process.env.CIRCUS_MONGO_TEST_URL ||
		process.env.CIRCUS_MONGO_URL ||
		process.env.MONGO_URL;
	const db = await MongoClient.connect(url);
	return db;
}

export async function setUpMongoFixture(db, collections) {
	if (!Array.isArray(collections)) {
		throw new TypeError('collections must be an array');
	}
	for (const colName of collections) {
		const col = db.collection(colName);
		await col.deleteMany({});
		const data = EJSON.parse(JSON.stringify(yaml(
			await fs.readFile(path.join(__dirname, 'fixture', colName + '.yaml'))
		)));
		for (const row of data) {
			if (!row.createdAt) row.createdAt = new Date();
			if (!row.updatedAt) row.updatedAt = new Date();
		}
		try {
			await col.insertMany(data);
		} catch (err) {
			console.log(err.errors);
			throw err;
		}
	}
}