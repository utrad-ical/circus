import { assert } from 'chai';
import createValidator from '../src/validation/createValidator';
import {
	setUpKoa, listenKoa, tearDownKoa,
	connectMongo, setUpMongoFixture,
	serverThrowsWithState
} from './test-utils';
import createModels from '../src/db/createModels';
import createOauthServer from '../src/middleware/auth/createOauthServer';
import errorHandler from '../src/middleware/errorHandler';
import bodyparser from 'koa-bodyparser';
import Router from 'koa-router';
import compose from 'koa-compose';
import axios from 'axios';
import * as path from 'path';
import * as qs from 'querystring';

describe('createOauthServer', function() {
	let db, server;

	before(async function() {
		db = await connectMongo();
		server = await listenKoa(await setUpKoa(async app => {
			const validator = await createValidator(path.join(__dirname, '..', 'src', 'schemas'));
			const models = createModels(db, validator);
			const oauth = createOauthServer(models, true);

			const router = new Router();
			router.post('/token', oauth.token());
			router.get('/data', compose([
				oauth.authenticate(),
				async ctx => ctx.body = { a: 100 }
			]));

			app.use(bodyparser());
			app.use(errorHandler());
			app.use(router.routes());
		}));
		await setUpMongoFixture(db, ['users']);
	});

	after(async function() {
		if (server) await tearDownKoa(server);
		if (db) await db.close();
	});

	it('should authenticate a request with valid token', async function() {
		const getTokenResult = await axios.request({
			method: 'post',
			url: server.url + 'token',
			data: qs.stringify({
				client_id: 'circus-front',
				client_secret: 'not-a-secret',
				grant_type: 'password',
				username: 'alice',
				password: 'aliceSecret'
			})
		});
		const token = getTokenResult.data.access_token;
		// console.log(token);
		const result = await axios.request({
			url: server.url + 'data',
			method: 'get',
			headers: { Authorization: `Bearer ${token}` }
		});
		assert.deepEqual(result.data, { a: 100 });
	});

	it('should return empty data with a request with invalid token', async function() {
		// no token
		await serverThrowsWithState(axios.request({
			url: server.url + 'data',
			method: 'get'
		}), 401);

		// wrong token
		const wrongToken = 'PeterPiperPickedAPepper';
		await serverThrowsWithState(axios.request({
			url: server.url + 'data',
			method: 'get',
			headers: { Authorization: `Bearer ${wrongToken}` }
		}), 401);
	});
});