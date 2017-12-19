import validateInOut from '../src/middleware/validateInOut';
import createValidator from '../src/createValidator';
import bodyParser from 'koa-bodyparser';
import errorHandler from '../src/middleware/errorHandler';
import axios from 'axios';
import Router from 'koa-router';
import * as path from 'path';
import * as test from './test-utils';
import { assert } from 'chai';

describe('validateInOut middleware', function() {
	let server;

	before(async function() {
		const app = await test.setUpKoa(async app => {
			const validator = await createValidator(path.join(__dirname, 'test-schemas'));
			const router = new Router();

			router.post(
				'/no-check',
				validateInOut(validator),
				async ctx => ctx.body = { response: 'OK' }
			);
			router.post(
				'/in-check',
				validateInOut(validator,
					{
						requestSchema: 'date|allRequired'
					}
				),
				async ctx => ctx.body = { foo: ctx.request.body.dateVal.toISOString() }
			);
			router.post(
				'/out-check',
				validateInOut(validator, { responseSchema: 'date' }),
				async ctx => ctx.body = ctx.request.body
			);

			app.use(bodyParser());
			app.use(errorHandler(true));
			app.use(router.routes());
		});
		server = await test.listenKoa(app);
	});

	after(async function() {
		await test.tearDownKoa(server);
	});

	it('should pass input validation', async function() {
		const res = await axios.request({
			url: server.url + 'in-check',
			method: 'post',
			data: { intVal: 5, dateVal: '2015-05-05T00:11:22.000Z' }
		});
		assert.equal(res.data.foo, '2015-05-05T00:11:22.000Z');
	});

	it('should fail input validation', async function() {
		const res = await axios.request({
			url: server.url + 'in-check',
			method: 'post',
			data: { intVal: 30, dateVal: 'invalid date' },
			validateStatus: null
		});
		assert.equal(res.status, 400);
	});

	it('should pass output validation', async function() {
		await axios.request({
			url: server.url + 'out-check',
			method: 'post',
			data: { intVal: 5 }
		});
	});

	it('should fail output validation', async function() {
		const res = await axios.request({
			url: server.url + 'out-check',
			method: 'post',
			data: { intVal: 'foo' },
			validateStatus: null
		});
		assert.equal(res.status, 500);
		assert.match(res.data.error, /Response schema validation error/i);
	});
});