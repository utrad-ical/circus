import { assert } from 'chai';
import * as test from './test-utils';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

describe('API', function() {
	let server, axios;

	before(async function() {
		server = await test.setUpAppForTest('trace');
		axios = server.axios.alice; // Alraedy includes access token for alice@example.com
	});

	after(async function() {
		await test.tearDownAppForTest(server);
	});

	describe('admin', function() {
		it('should return unauthorized error for unauthorized user', async function() {
			const targets = [
				'groups', 'groups/1', 'PUT groups/1',
				'users', 'users/alice@example.com', 'PUT users/alice@example.com',
				'projects', 'server-params'
			];
			for (const target of targets) {
				let [method, url] = target.split(' ');
				if (!url) { method = 'GET'; url = target; }
				// console.log(method, target);
				const data = method.match(/GET|PUT/) ? { a: 10 } : undefined;
				await test.serverThrowsWithState(
					server.axios.bob.request({
						url: server.url + 'api/admin/' + url,
						method,
						data
					}),
					401, /privilege/
				);
			}
		});
	});

	describe('admin/groups', function() {
		beforeEach(async function() {
			await test.setUpMongoFixture(server.db, ['groups']);
		});

		it('should return list of groups', async function() {
			const res = await axios.get(server.url + 'api/admin/groups');
			assert.isArray(res.data.items);
			assert.equal(res.data.items[0].groupName, 'admin');
		});

		it('should return a group', async function() {
			const res = await axios.get(server.url + 'api/admin/groups/1');
			assert.equal(res.data.groupName, 'admin');
		});

		it('should return error for nonexistent group', async function() {
			await test.serverThrowsWithState(
				axios.get(server.url + 'api/admin/groups/7'),
				404
			);
			await test.serverThrowsWithState(
				axios.get(server.url + 'api/admin/groups/bad'),
				404
			);
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

		it('should return error for invalid group update', async function() {
			await test.serverThrowsWithState(
				axios.request({
					method: 'put',
					url: server.url + 'api/admin/groups/1',
					data: { groupName: 72 }
				}),
				400
			);
			await test.serverThrowsWithState(
				axios.request({
					method: 'put',
					url: server.url + 'api/admin/groups/1',
					data: { groupId: 45 }
				}),
				400, /primary key/
			);
		});

		it('should return global-privileges', async function() {
			const res = await axios(server.url + 'api/admin/global-privileges');
			assert.isTrue(res.data.length > 1);
			assert.isTrue(res.data.every(p => p.privilege && p.caption));
		});

		it.skip('should reject unknown field');
	});

	describe('admin/users', function() {
		beforeEach(async function() {
			await test.setUpMongoFixture(server.db, ['users']);
		});

		it('should return list of users', async function() {
			const res = await axios.get(server.url + 'api/admin/users');
			assert.isArray(res.data.items);
			assert.isTrue(res.data.items.some(u => u.loginId === 'bob'));
			assert.isFalse(res.data.items.some(u => u.password), 'Result data included password field.');
		});

		it('should return a user', async function() {
			const res = await axios.get(server.url + 'api/admin/users/alice@example.com');
			assert.equal(res.data.loginId, 'alice');
			assert.notExists(res.data.password);
		});

		it('should return error for nonexistent user', async function() {
			await test.serverThrowsWithState(
				axios.get(server.url + 'api/admin/user/john@due.com'),
				404
			);
		});

		it('should update a user', async function() {
			await axios.request({
				method: 'put',
				url: server.url + 'api/admin/users/alice@example.com',
				data: { loginId: 'anastasia' }
			});
			const res2 = await axios.get(server.url + 'api/admin/users/alice@example.com');
			assert.equal(res2.data.loginId, 'anastasia');
		});

		it('should return error for invalid user update', async function() {
			await test.serverThrowsWithState(
				axios.request({
					method: 'put',
					url: server.url + 'api/admin/users/alice@example.com',
					data: { groups: ['this-must-not-be', 'strings'] }
				}),
				400
			);
			await test.serverThrowsWithState(
				axios.request({
					method: 'put',
					url: server.url + 'api/admin/users/alice@example.com',
					data: { userEmail: 'alice.new.mail@example.com' }
				}),
				400, /primary key/
			);
		});

		it.skip('should reject unknown field');
	});

	describe('admin/projects', function() {
		it('should return list of projects', async function() {
			const res = await axios.get(server.url + 'api/admin/projects');
			assert.isArray(res.data.items);
			assert.isTrue(res.data.items.some(p => p.projectName === 'Lung nodules'));
		});

		it('should return a project', async function() {
			const res = await axios.get(server.url + 'api/admin/projects/8883fdef6f5144f50eb2a83cd34baa44');
			assert.equal(res.data.projectName, 'Lung nodules');
		});
	});

	describe('admin/server-params', function() {
		beforeEach(async function() {
			await test.setUpMongoFixture(server.db, ['serverParams']);
		});

		it('should return parameters', async function() {
			const res = await axios.get(server.url + 'api/admin/server-params');
			assert.deepEqual(res.data, { foo: 'bar', color: ['green', 'black', 'blue'] });
		});

		it('should return one parameter', async function() {
			const res = await axios.get(server.url + 'api/admin/server-params/color');
			assert.deepEqual(res.data, ['green', 'black', 'blue']);
		});

		it('should update one parameter', async function() {
			const res = await axios.request({
				url: server.url + 'api/admin/server-params/color',
				method: 'put',
				data: ['orange']
			});
			assert.equal(res.status, 204);
			const res2 = await axios.get(server.url + 'api/admin/server-params');
			assert.deepEqual(res2.data.color, ['orange']);
		});

		it('should bulk-update parametes', async function() {
			const res = await axios.request({
				url: server.url + 'api/admin/server-params',
				method: 'put',
				data: { foo: 'buz', price: 1980 }
			});
			assert.equal(res.status, 204);
			const res2 = await axios.get(server.url + 'api/admin/server-params');
			assert.deepEqual(
				res2.data,
				{ foo: 'buz', color: ['green', 'black', 'blue'], price: 1980 }
			);
		});
	});

	describe('series', function() {
		it('should perform search', async function() {
			const res = await axios.request({
				url: server.url + 'api/series',
				method: 'get'
			});
			assert.equal(res.status, 200);
			assert.equal(res.data.items.length, 3);
		});

		it('should return single series information', async function() {
			const res = await axios.request({
				url: server.url + 'api/series/111.222.333.444.666',
				method: 'get'
			});
			assert.equal(res.data.manufacturer, 'Hatsushiba');
		});

		describe('uploading', function() {
			it('should upload signle DICOM file', async function() {
				const file = path.join(__dirname, 'dicom', 'CT-MONO2-16-brain.dcm');
				const formData = new FormData();
				formData.append('files', fs.createReadStream(file));
				const res = await axios.request({
					method: 'post',
					headers: formData.getHeaders(),
					url: server.url + 'api/series',
					data: formData,
					validateStatus: null
				});
				if (res.status === 503) { this.skip(); return; }
				assert.equal(res.status, 204);
			});

			it.skip('should upload zipped DICOM files');
		});
	});

	describe('cases', function() {
		const cid = 'faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';

		it('should perform search', async function() {
			const res = await axios.request({
				url: server.url + 'api/cases',
				method: 'get'
			});
			assert.equal(res.status, 200);
			assert.equal(res.data.items.length, 1);
		});

		it('should return single case information', async function() {
			const res = await server.axios.bob.request({
				url: server.url + `api/cases/${cid}`,
				method: 'get'
			});
			assert.equal(res.data.projectId, '8883fdef6f5144f50eb2a83cd34baa44');
		});

		it('should reject revision read access from unauthorized user', async function() {
			await test.serverThrowsWithState(server.axios.guest.get(
				server.url + `api/cases/${cid}`
			), 401, /read/);
		});

		it('should add a revision', async function() {
			const res = await server.axios.bob.request({
				url: server.url + `api/cases/${cid}/revision`,
				method: 'post',
				data: {
					description: 'Add something',
					attributes: {},
					status: 'for-review',
					series: []
				}
			});
			assert.equal(res.status, 204);
			const res2 = await server.axios.bob.get(
				server.url + `api/cases/${cid}`
			);
			assert.equal(res2.data.revisions[1].creator, 'bob@example.com');
		});

		it('should reject revision addition from unauthorized user', async function() {
			await test.serverThrowsWithState(server.axios.guest.request({
				url: server.url + `api/cases/${cid}/revision`,
				method: 'post',
				data: { anything: 'can be used' }
			}), 401, /write/);
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
		it('should return the preference of the current user', async function() {
			const res = await axios.get(server.url + 'api/preferences');
			assert.equal(res.data.theme, 'mode_white');
		});

		it('should modify the preference of the current user', async function() {
			await axios.request({
				url: server.url + 'api/preferences',
				method: 'put',
				data: { theme: 'mode_black', personalInfoView: false }
			});
			const res2 = await axios.get(server.url + 'api/preferences');
			assert.equal(res2.data.theme, 'mode_black');
		});

		it('should reject invalid preference update', async function() {
			await test.serverThrowsWithState(axios.request({
				url: server.url + 'api/preferences',
				method: 'put',
				data: { theme: 'mode_pink', personalInfoView: false }
			}), 400);
		});
	});

});