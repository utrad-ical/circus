import axios from 'axios';
import { assert } from 'chai';
import * as test from './test-utils';
import createApp from '../src/createApp';

describe('API', function() {
	let db, server;

	before(async function() {
		db = await test.connectMongo();
		await test.setUpMongoFixture(db, ['series', 'clinicalCases']);
		const app = await createApp({ debug: true, db, noAuth: true });
		server = await test.listenKoa(app);
	});

	after(async function() {
		await test.tearDownKoa(server);
		await db.close();
	});

	describe('series', function() {
		it('should perform search', async function() {
			const res = await axios.request({
				url: server.url + 'api/series',
				method: 'get'
			});
			assert.equal(res.status, 200);
			assert.equal(res.data.length, 3);
		});

		it('should return single series information', async function() {
			const res = await axios.request({
				url: server.url + 'api/series/111.222.333.444.666',
				method: 'get'
			});
			assert.equal(res.data.manufacturer, 'Hatsushiba');
		});

		it.skip('should upload series data');
	});

	describe('cases', function() {
		it('should perform search', async function() {
			const res = await axios.request({
				url: server.url + 'api/cases',
				method: 'get'
			});
			assert.equal(res.status, 200);
			assert.equal(res.data.length, 1);
		});

		it('should return single case information', async function() {
			const res = await axios.request({
				url: server.url + 'api/cases/faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b',
				method: 'get'
			});
			assert.equal(res.data.projectId, '8883fdef6f5144f50eb2a83cd34baa44');
		});
	});

	describe('preference', function() {
	});

});