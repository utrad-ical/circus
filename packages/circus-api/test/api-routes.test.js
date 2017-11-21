import axios from 'axios';
import { assert } from 'chai';
import * as test from './test-utils';
import createApp from '../src/createApp';
import createLogger from '../src/logging/createLogger';

describe('API', function() {
	let db, server;

	before(async function() {
		db = await test.connectMongo();
		await test.setUpMongoFixture(
			db,
			['series', 'clinicalCases', 'groups', 'projects', 'users']
		);
		const app = await createApp({ debug: true, db, noAuth: true, logger: createLogger('trace') });
		server = await test.listenKoa(app);
	});

	after(async function() {
		await test.tearDownKoa(server);
		await db.close();
	});

	describe('admin/groups', function() {
		it('should return list of groups', async function() {
			const res = await axios.get(server.url + 'api/admin/groups');
			assert.isArray(res.data);
			assert.equal(res.data[0].groupName, 'admin');
		});

		it('should return a group', async function() {
			const res = await axios.get(server.url + 'api/admin/groups/1');
			assert.equal(res.data.groupName, 'admin');
		});

		it('should update a group', async function() {
			await axios.request({
				method: 'put',
				url: server.url + 'api/admin/groups/1',
				data: { groupName: 'root' }
			});
			const res2 = await axios.get(server.url + 'api/admin/groups/1');
			assert.equal(res2.data.groupName, 'root');
		});
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

	describe('blobs', function() {
		const sha1 = '4e3e01b9af84f54d95f94d24eeb0583332a85268';

		it('should accept uploading and downloading a blob', async function() {
			const res = await axios.request({
				method: 'put',
				url: server.url + 'api/blob/' + sha1,
				headers: { 'Content-Type': 'application/octet-stream' },
				data: 'star'
			});
			assert.equal(res.status, 200);
			const res2 = await axios.request({
				method: 'get',
				url: server.url + 'api/blob/' + sha1
			});
			assert.equal(res2.data, 'star');
		});

		it('should return 400 on hash mismatch', async function() {
			await test.serverThrowsWithState(axios.request({
				method: 'put',
				url: server.url + 'api/blob/1111222233334444aaaabbbbcccc',
				headers: { 'Content-Type': 'application/octet-stream' },
				data: 'star'
			}), 400);
		});

		it('should return 404 for nonexistent hash', async function() {
			await test.serverThrowsWithState(axios.request({
				method: 'get',
				url: server.url + 'api/blob/aaabbbcccdddeeefff111222333'
			}), 404);
		});
	});

	describe('preference', function() {
	});

});