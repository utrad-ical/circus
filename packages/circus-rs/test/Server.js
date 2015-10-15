var config = require('config');
var Server = require('../build/Server');
var supertest = require('supertest');

describe('Server', function() {
	var server;
	var httpServer;

	beforeEach(function(done) {
		server = new Server(config);
		server.start();
		httpServer = server.getServer();
		httpServer.on('listening', done);
		httpServer.on('error', function(err) {
			done(err);
		});
	});

	afterEach(function (done) {
		server.close().then(done);
	});

	it('must return JSON for status', function(done) {
		supertest(httpServer)
			.get('/status')
			.expect(200)
			.expect('Content-Type', 'application/json')
			.expect(/Running/)
			.end(done);
	});
});