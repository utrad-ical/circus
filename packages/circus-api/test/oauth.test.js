import { assert } from 'chai';
import createValidator from '../src/validation/createValidator';
import { setUpKoa, listenKoa, tearDownKoa, connectMongo, setUpMongoFixture } from './test-utils';
import createModels from '../src/db/createModels';
import createOauthServer from '../src/middleware/auth/createOauthServer';
import errorHandler from '../src/middleware/errorHandler';
import bodyparser from 'koa-bodyparser';
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
			app.use(bodyparser());
			app.use(errorHandler());
			app.use(oauth.token());
		}));
		await setUpMongoFixture(db, ['users']);
	});

	after(async function() {
		if (server) await tearDownKoa(server);
		if (db) await db.close();
	});

	it('should issue a new access token', async function() {
		const result = await axios.request({
			method: 'post',
			url: server.url,
			data: qs.stringify({
				client_id: 'circus-front',
				client_secret: 'not-a-secret',
				grant_type: 'password',
				username: 'alice',
				password: 'aliceSecret'
			})
		});
		assert.exists(result.data.access_token);
	});
});