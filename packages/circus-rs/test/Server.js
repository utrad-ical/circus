'use strict';

var Server = require('../lib/server/Server').default;
var supertest = require('supertest');
var moduleLoader = require('../lib/server/ModuleLoader');

function newConfig() {
	return {
		dicomFileRepository: {
			module: "StaticDicomFileRepository",
			options: { dataDir: __dirname, useHash: false }
		},
		port: 1024,
		logger: { module: "NullLogger" },
		dumper: { module: "MockDicomDumper", options: { depth: 5 } },
		imageEncoder: { module: "ImageEncoder_pngjs", options: {} },
		globalIpFilter: '^127.0.0.1$',
		cache: { memoryThreshold: 2147483648 },
		authorization: {
			enabled: false,
			tokenRequestIpFilter: '^127.0.0.1$',
			expire: 1800
		}
	};
};

describe('Server', function() {

	runServerTests('without authentication', false);
	runServerTests('with authentication', true);

	function runServerTests(contextText, useAuth) {
		context(contextText, function() {

			var server;
			var httpServer;
			var token;

			beforeEach(function(done) {
				const config = newConfig();
				config.authorization.enabled = useAuth;
				server = new Server(
					moduleLoader.loadModule(moduleLoader.ModuleType.Logger, config.logger),
					moduleLoader.loadModule(moduleLoader.ModuleType.ImageEncoder, config.imageEncoder),
					moduleLoader.loadModule(moduleLoader.ModuleType.DicomFileRepository, config.dicomFileRepository),
					moduleLoader.loadModule(moduleLoader.ModuleType.DicomDumper, config.dumper),
					config
				);
				server.start();
				httpServer = server.getServer();
				httpServer.on('listening', () => {
					if (useAuth) {
						supertest(httpServer)
							.get('/token')
							.query({ series: '1.2.3.4.5' })
							.expect(200)
							.expect(res => token = res.body.token) // remember token
							.end(done);
					} else {
						token = null;
						done();
					}
				});
				httpServer.on('error', function(err) {
					done(err);
				});
			});

			afterEach(function(done) {
				server.close().then(done);
			});

			it('must return JSON for status', function(done) {
				supertest(httpServer)
					.get('/status')
					.expect(200)
					.expect('Content-Type', /application\/json/)
					.expect(/Running/)
					.end(done);
			});

			it('must reject invalid access using globalIpFilter', function(done) {
				server.getApp().enable('trust proxy'); // Enable IP address mangling
				supertest(httpServer)
					.get('/status')
					.set('X-Forwarded-For', '127.0.0.11') // change IP
					.expect(401)
					.end(done);
			});

			if (useAuth) {
				it('must return authentication error if token not passed', function(done) {
					supertest(httpServer)
						.get('/series/1.2.3.4.5/metadata')
						.expect(401)
						.end(done);
				});

				it('must return authentication error if passed token is not matched', function(done) {
					supertest(httpServer)
						.get('/series/8.8.8.8.8/metadata')
						.set('Authorization', 'Bearer ' + token)
						.expect(401)
						.end(done);
				});

				it('must reject token request from invalid IP', function(done) {
					server.getApp().enable('trust proxy');
					supertest(httpServer)
						.get('/token')
						.set('X-Forwarded-For', '127.0.0.2')
						.expect(401)
						.end(done);
				});
			}

			it('must return metadata', function(done) {
				var test = supertest(httpServer).get('/series/1.2.3.4.5/metadata');
				if (token) test.set('Authorization', 'Bearer ' + token);
				test.expect(200)
					.expect('Content-Type', /application\/json/)
					.end(done);
			});

			it('must return volume', function(done) {
				var test = supertest(httpServer).get('/series/1.2.3.4.5/volume');
				if (token) test.set('Authorization', 'Bearer ' + token);
				test.expect(200)
					.expect('Content-Type', 'application/octet-stream')
					.end(done);
			});

			it('must return oblique image in binary format', function(done) {
				var test = supertest(httpServer).get('/series/1.2.3.4.5/scan');
				if (token) test.set('Authorization', 'Bearer ' + token);
				test.query({
						origin: '200,200,50',
						xAxis: '512,0,0',
						yAxis: '0,512,0',
						size: '50,50'
					})
					.expect(200)
					.expect('Content-Type', 'application/octet-stream')
					.end(done);
			});

			it('must return oblique image in PNG format', function(done) {
				var test = supertest(httpServer).get('/series/1.2.3.4.5/scan');
				if (token) test.set('Authorization', 'Bearer ' + token);
				test.query({
					origin: '200,200,50',
						xAxis: '512,0,0',
						yAxis: '0,512,0',
						size: '50,50',
						format: 'png',
						ww: 50,
						wl: 50
					})
					.expect(200)
					.expect('Content-Type', 'image/png')
					.end(done);
			});

			it('must return 404 for nonexistent route', function(done) {
				supertest(httpServer)
					.get('/foobar')
					.expect(404)
					.end(done);
			});

		});
	}


});
