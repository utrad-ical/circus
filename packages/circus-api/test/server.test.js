import createApp from '../src/createApp';
import axios from 'axios';
import { assert } from 'chai';
import { serverThrowsWithState } from './koa-test';

const port = process.env.API_TEST_PORT || 8081;

describe('Basic server behavior', function() {
	let serverUrl = `http://localhost:${port}/`;
	let server;

	before(function(done) {
		createApp({ debug: true }).then(app => {
			server = app.listen(
				port,
				'localhost',
				err => { if (!err) done(); }
			);
		});
	});

	after(function(done) {
		if (server) {
			server.close(err => { if (!err) done(); });
		} else done();
	});

	it('should return server status', async function() {
		const result = await axios.get(serverUrl + 'status');
		assert.equal(result.status, 200);
		assert.equal(result.data.status, 'running');
	});

	it('should return 404 for root path', async function() {
		await serverThrowsWithState(
			axios.get(serverUrl),
			404
		);
	});

	it('should return 400 for malformed JSON input', async function() {
		await serverThrowsWithState(
			axios.request({
				method: 'post',
				url: serverUrl + 'echo',
				data: {},
				headers: { 'Content-Type': 'application/json' },
				transformRequest: [() => '{I+am+not.a.valid-JSON}}']
			}),
			400 // Bad request
		);
	});

	it('should return 415 if content type is not set to JSON', async function() {
		await serverThrowsWithState(
			axios.request({
				method: 'post',
				url: serverUrl + 'echo',
				headers: { 'Content-Type': 'text/plain', 'X-poe': 'poepoe' },
				data: 'testdata'
			}),
			415 // Unsupported media type
		);
	});

	it('should return 400 for huge JSON > 1mb', async function() {
		const bigData = { foo: 'A'.repeat(1024 * 1024) };
		await serverThrowsWithState(
			axios.request({
				method: 'post',
				url: serverUrl + 'echo',
				data: bigData
			}),
			400 // Bad request
		);
	});

	describe('Echo', function() {
		it('should return input data as-is', async function() {
			const data = { a: 10, b: 'test', c: { d: 999, e: 'TEST' } };
			const res = await axios.post(serverUrl + 'echo', data);
			assert.deepEqual(res.data, data);
		});
	});


});