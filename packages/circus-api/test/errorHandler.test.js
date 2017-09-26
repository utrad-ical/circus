import createApp from '../src/createApp';
import errorHandler from '../src/middleware/errorHandler';
import axios from 'axios';
import Koa from 'koa';
import Router from 'koa-router';
import Ajv from 'ajv';
import { assert } from 'chai';

const port = process.env.API_TEST_PORT || 8081;

describe('errorHandler middleware', function() {
	let serverUrl = `http://localhost:${port}/`;
	let server;

	before(function(done) {
		const app = new Koa();
		
		app.use(errorHandler(true));
		
		const router = new Router();

		router.get('/found', async ctx => {
			ctx.body = 'Hello';
		});

		router.get('/invalid', async ctx => {
			const ajv = new Ajv();
			const schema = { $async: true, type: 'number' };
			await ajv.validate(schema, 'hi'); // validation fails
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
			ctx.body = null.foo;
		});
		
		router.get('/error-403', async ctx => {
			ctx.throw(403, 'no!');
		});

		app.use(router.routes());
		server = app.listen(
			port,
			'localhost',
			err => { if (!err) done(); }
		);
	});
	
	after(function(done) {
		if (server) {
			server.close(err => { if (!err) done(); });
		} else done();
	});
	
	it('should return 200 for normal request', async function() {
		const res = await axios.request({
			url: serverUrl + 'found',
			method: 'get'
		});
		assert.equal(res.status, 200);
	});
	
	it('should return 404 for nonexistent path', async function() {
		try {
			await axios.request({
				url: serverUrl + 'not-found',
				method: 'get'
			});
		} catch (err) {
			assert.equal(err.response.status, 404);
			assert.match(err.response.data.error, /not found/i);
			return;
		}
		throw new Error();
	});
	
	it('should return 400 for request validation error', async function() {
		try {
			await axios.request({
				url: serverUrl + 'invalid',
				method: 'get'
			});
		} catch (err) {
			assert.equal(err.response.status, 400);
			assert.match(err.response.data.error, /request data is not correct/i);
			return;
		}
		throw new Error();
	});

	it('should return 500 for server-side validation error', async function() {
		try {
			await axios.request({
				url: serverUrl + 'invalid-on-response',
				method: 'get'
			});
		} catch (err) {
			assert.equal(err.response.status, 500);
			assert.match(err.response.data.error, /response schema validation error/i);
			return;
		}
		throw new Error();
	});

	it('should return 500 for server-side run-time error', async function() {
		try {
			await axios.request({
				url: serverUrl + 'server-side-error',
				method: 'get'
			});
		} catch (err) {
			assert.equal(err.response.status, 500);
			assert.exists(err.response.data.stack);
			return;
		}
		throw new Error();
	});

	it('should return 403 for server-side run-time error', async function() {
		try {
			await axios.request({
				url: serverUrl + 'error-403',
				method: 'get'
			});
		} catch (err) {
			assert.equal(err.response.status, 403);
			assert.equal(err.response.data.error, 'no!');
			return;
		}
		throw new Error();
	});
});