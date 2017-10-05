import { assert } from 'chai';
import createValidator from '../src/validation/createValidator';
import { setUpKoa, listenKoa, tearDownKoa, connectMongo } from './koa-test';
import createModels from '../src/db/createModels';
import createOauthServer from '../src/middleware/auth/createOauthServer';
import bodyparser from 'koa-bodyparser';
import axios from 'axios';
import * as path from 'path';
import * as qs from 'querystring';

describe.skip('createOauthServer', function() {
	let db, server;

	before(async function() {
		db = await connectMongo();
		server = await listenKoa(await setUpKoa(async app => {
			const validator = await createValidator(path.join(__dirname, '..', 'schemas'));
			const models = createModels(db, validator);
			const oauth = createOauthServer(models, true);
			app.use(bodyparser());
			app.use(oauth.grant());
		}));
	});

	after(async function() {
		if (server) await tearDownKoa(server);
		if (db) await db.close();
	});

	it('should issue a new access token', async function() {
		try {
			const result = await axios.request({
				method: 'post',
				url: server.url,
				data: qs.stringify({
					client_id: 'circus-front',
					client_secret: 'not-a-secret',
					grant_type: 'password',
					username: 'foo',
					password: 'bar'
				})
			});
			console.log(result.data);
		} catch (err) {
			console.error(err.data);
		}
	});
});