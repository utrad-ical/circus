import axios from 'axios';
import { assert } from 'chai';
import * as test from './test-utils';
import checkGlobalPrivileges from '../src/middleware/auth/checkGlobalPrivileges';
import createValidator from '../src/createValidator';
import createModels from '../src/db/createModels';

describe('checkGlobalPrivileges middleware', function() {
	let server, db;
	let userEmail;

	before(async function() {
		db = await test.connectMongo();
		await test.setUpMongoFixture(db, ['groups', 'users']);
		const validator = await createValidator();
		const models = createModels(db, validator);
		const app = await test.setUpKoa(async app => {
			app.use(async (ctx, next) => {
				ctx.models = models;
				ctx.user = await models.user.findByIdOrFail(userEmail);
				await next();
			});
			app.use(checkGlobalPrivileges({ models }, ['manageServer', 'personalInfoView']));
			app.use(async (ctx, next) => {
				ctx.body = 'Danger Zone';
			});
		});
		server = await test.listenKoa(app);
	});

	after(async function() {
		if (server) await test.tearDownKoa(server);
		if (db) await db.close();
	});

	it('should pass for user with a good privilege', async function() {
		userEmail = 'alice@example.com';
		const res = await axios.request({
			url: server.url,
			method: 'get'
		});
		assert.equal(res.data, 'Danger Zone');
	});

	it('should fail for user without a privilege', async function() {
		userEmail = 'bob@example.com';
		await test.serverThrowsWithState(
			axios.request({
				url: server.url,
				method: 'get'
			}),
			401 // Unauthorized
		);
	});
});