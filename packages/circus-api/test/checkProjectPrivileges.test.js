import axios from 'axios';
import { assert } from 'chai';
import * as test from './test-utils';
import checkProjectPrivileges, { injectCaseAndProject }
	from '../src/middleware/auth/checkProjectPrivileges';
import createValidator from '../src/createValidator';
import createModels from '../src/db/createModels';
import { determineUserAccessInfo } from '../src/privilegeUtils';

describe('checkProjectPrivileges middleware', function() {
	let server, db;
	let userEmail;

	before(async function() {
		db = await test.connectMongo();
		await test.setUpMongoFixture(db, ['groups', 'users', 'projects', 'clinicalCases']);
		const validator = await createValidator();
		const models = createModels(db, validator);
		const app = await test.setUpKoa(async app => {
			app.use(async (ctx, next) => {
				ctx.params = { caseId: 'faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b' };
				ctx.user = await models.user.findByIdOrFail(userEmail);
				ctx.userPrivileges = await determineUserAccessInfo(models, ctx.user);
				await next();
			});
			app.use(injectCaseAndProject({ models }));
			app.use(checkProjectPrivileges({ models }, 'write'));
			app.use(async (ctx, next) => {
				ctx.body = 'Protected Area';
			});
		});
		server = await test.listenKoa(app);
	});

	after(async function() {
		if (server) await test.tearDownKoa(server);
		if (db) await db.close();
	});

	it('should pass for user with a good privilege', async function() {
		userEmail = 'bob@example.com';
		const res = await axios.request({
			url: server.url,
			method: 'get'
		});
		assert.equal(res.data, 'Protected Area');
	});

	it('should fail for user without a privilege', async function() {
		userEmail = 'alice@example.com';
		await test.serverThrowsWithState(
			axios.request({
				url: server.url,
				method: 'get'
			}),
			401 // Unauthorized
		);
	});
});