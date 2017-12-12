import axios from 'axios';
import { assert } from 'chai';
import * as test from './test-utils';
import checkPrivilege from '../src/middleware/auth/checkPrivilege';
import createValidator from '../src/createValidator';
import createModels from '../src/db/createModels';
import { determineUserAccessInfo } from '../src/privilegeUtils';
import Router from 'koa-router';
import compose from 'koa-compose';

describe('checkPrivilege middleware', function() {
	let server, db;
	let userEmail;

	before(async function() {
		db = await test.connectMongo();
		await test.setUpMongoFixture(db, ['groups', 'users', 'projects', 'clinicalCases']);
		const validator = await createValidator();
		const models = createModels(db, validator);
		const app = await test.setUpKoa(async app => {
			app.use(async (ctx, next) => {
				ctx.user = await models.user.findByIdOrFail(userEmail);
				ctx.userPrivileges = await determineUserAccessInfo(models, ctx.user);
				await next();
			});
			const router = new Router();
			// app.use(async (ctx, next) => {
			// 	try { await next(); } catch (err) { console.log(err); throw err; }
			// });
			router.get('/g', compose([
				checkPrivilege({ models }, { requiredGlobalPrivilege: 'manageServer' }),
				async (ctx, next) => ctx.body = 'Protected Area'
			]));
			router.get('/c/:caseId', compose([
				checkPrivilege({ models }, { requiredProjectPrivilege: 'read' }),
				async (ctx, next) => ctx.body = 'Protected Area'
			]));
			router.get('/p/:projectId', compose([
				checkPrivilege({ models }, { requiredProjectPrivilege: 'read' }),
				async (ctx, next) => ctx.body = 'Protected Area'
			]));
			app.use(router.routes());
		});
		server = await test.listenKoa(app);
	});

	after(async function() {
		if (server) await test.tearDownKoa(server);
		if (db) await db.close();
	});

	describe('global privilege checker', function() {
		it('should pass for user with good global privilege', async function() {
			userEmail = 'alice@example.com';
			const res = await axios.get(server.url + 'g');
			assert.equal(res.data, 'Protected Area');
		});

		it('should fail for user with bad global privilege', async function() {
			userEmail = 'bob@example.com';
			await axios.get(server.url + 'g', { validateStatus: s => s === 401 });
		});
	});

	describe('project privilege checker', function() {
		it('should pass for user with good project privilege', async function() {
			const resource = server.url + 'c/faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';
			userEmail = 'bob@example.com';
			const res = await axios.get(resource);
			assert.equal(res.data, 'Protected Area');
		});

		it('should fail for user without a privilege', async function() {
			const resource = server.url + 'c/faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';
			userEmail = 'alice@example.com';
			await axios.get(resource, { validateStatus: s => s === 401 });
		});

		it('should pass for user with good project privilege', async function() {
			const resource = server.url + 'p/8883fdef6f5144f50eb2a83cd34baa44';
			userEmail = 'bob@example.com';
			const res = await axios.get(resource);
			assert.equal(res.data, 'Protected Area');
		});

		it('should fail for user without a projectprivilege', async function() {
			const resource = server.url + 'p/8883fdef6f5144f50eb2a83cd34baa44';
			userEmail = 'alice@example.com';
			await axios.get(resource, { validateStatus: s => s === 401 });
		});
	});
});