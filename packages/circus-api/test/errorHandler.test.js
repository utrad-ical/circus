import errorHandler from '../src/middleware/errorHandler';
import axios from 'axios';
import Router from 'koa-router';
import Ajv from 'ajv';
import { assert } from 'chai';
import * as test from './test-utils';

describe('errorHandler middleware', function() {
	let server;

	before(async function() {
		const app = await test.setUpKoa(async app => {
			const router = new Router();

			router.get('/found', async ctx => {
				ctx.body = 'Hello';
			});

			router.get('/invalid', async ctx => {
				const ajv = new Ajv();
				const schema = { $async: true, type: 'number' };
				try {
					await ajv.validate(schema, 'hi'); // validation fails
				} catch (err) {
					err.phase = 'request';
					throw err;
				}
			});

			router.get('/invalid-on-response', async ctx => {
				const ajv = new Ajv();
				const schema = { $async: true, type: 'number' };
				try {
					await ajv.validate(schema, 'hi'); // validation fails
				} catch (err) {
					err.phase = 'response';
					throw err;
				}
			});

			router.get('/server-side-error', async ctx => {
				ctx.body = null.foo; // intentional run time error
			});

			router.get('/error-403', async ctx => {
				ctx.throw(403, 'no!');
			});

			app.use(errorHandler(true, 'off'));
			app.use(router.routes());
		});
		server = await test.listenKoa(app);
	});

	after(async function() {
		await test.tearDownKoa(server);
	});

	it('should return 200 for normal request', async function() {
		const res = await axios.request({
			url: server.url + 'found',
			method: 'get'
		});
		assert.equal(res.status, 200);
	});

	it('should return 404 for nonexistent path', async function() {
		const res = await axios.request({
			url: server.url + 'not-found',
			method: 'get',
			validateStatus: null
		});
		assert.equal(res.status, 404);
	});

	it('should return 400 for request validation error', async function() {
		const res = await axios.request({
			url: server.url + 'invalid',
			method: 'get',
			validateStatus: null
		});
		assert.equal(res.status, 400);
		assert.match(res.data.error, /request data is not correct/i);
	});

	it('should return 500 for server-side validation error', async function() {
		const res = await axios.request({
			url: server.url + 'invalid-on-response',
			method: 'get',
			validateStatus: null
		});
		assert.equal(res.status, 500);
		assert.match(res.data.error, /response schema validation error/i);
	});

	it('should return 500 for server-side run-time error', async function() {
		const res = await axios.request({
			url: server.url + 'server-side-error',
			method: 'get',
			validateStatus: null
		});
		assert.equal(res.status, 500);
		assert.exists(res.data.stack);
	});

	it('should return 403 for server-side access error', async function() {
		const res = await axios.request({
			url: server.url + 'error-403',
			method: 'get',
			validateStatus: null
		});
		assert.equal(res.status, 403);
		assert.match(res.data.error, /no!/);
	});
});