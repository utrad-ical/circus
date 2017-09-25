import createApp from '../src/createApp';
import axios from 'axios';
import { assert } from 'chai';

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
		try {
			await axios.get(serverUrl);
		} catch(err) {
			assert.equal(err.response.status, 404);
			return;
		}
		new Error('Server did not raise an error.');
	});
	
	it('should return 400 for malformed JSON input', async function() {
		try {
			await axios.request({
				method: 'post',
				url: serverUrl + 'echo',
				data: {},
				headers: { 'Content-Type': 'application/json' },
				transformRequest: [() => '{I+am+not.a.valid-JSON}}']
			});
		} catch(err) {
			assert.exists(err.response);
			assert.equal(err.response.status, 400);
			return;
		}
		throw new Error('Server did not raise an error.');
	});
	
	it('should return 415 if content type is not set to JSON', async function() {
		try {
			await axios.request({
				method: 'post',
				url: serverUrl + 'echo',
				headers: { 'Content-Type': 'text/plain', 'X-poe': 'poepoe' },
				data: 'testdata'
			});
		} catch(err) {
			assert.exists(err.response);
			assert.equal(err.response.status, 415); // Unsupported media type
			return;
		}
		throw new Error('Server did not raise an error.');
	});
	
	it('should return 400 for huge JSON > 1mb', async function() {
		try {
			const bigData = { foo: 'A'.repeat(1024 * 1024) };
			await axios.request({
				method: 'post',
				url: serverUrl + 'echo',
				data: bigData
			});
		} catch(err) {
			assert.exists(err.response);
			assert.equal(err.response.status, 400);
			return;
		}
		throw new Error('Server did not raise an error.');
	});
});