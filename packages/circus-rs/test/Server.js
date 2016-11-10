var Server = require('../lib/server/Server').default;
var supertest = require('supertest');
var moduleLoader = require('../lib/server/ModuleLoader');

var config = {
	dicomFileRepository: {
		module: "StaticDicomFileRepository",
		options: {dataDir: __dirname, useHash: false}
	},
	port: 1024,
	logs: [],
	dumper: {module: "MockDicomDumper", options: { depth: 5 }},
	imageEncoder: {module: "ImageEncoder_pngjs", options: {}},
	cache: {memoryThreshold: 2147483648},
	authorization: {require: false, allowFrom: "127.0.0.1", expire: 1800}
};

describe('Server', function () {
	var server;
	var httpServer;

	beforeEach(function (done) {
		server = new Server(
			moduleLoader.loadModule(moduleLoader.ModuleType.ImageEncoder, config.imageEncoder),
			moduleLoader.loadModule(moduleLoader.ModuleType.DicomFileRepository, config.dicomFileRepository),
			moduleLoader.loadModule(moduleLoader.ModuleType.DicomDumper, config.dumper),
			config
		);
		server.start();
		httpServer = server.getServer();
		httpServer.on('listening', done);
		httpServer.on('error', function (err) {
			done(err);
		});
	});

	afterEach(function (done) {
		server.close().then(done);
	});

	it('must return JSON for status', function (done) {
		supertest(httpServer)
			.get('/status')
			.expect(200)
			.expect('Content-Type', 'application/json')
			.expect(/Running/)
			.end(done);
	});

	it('must return metadata', function (done) {
		supertest(httpServer)
			.get('/metadata')
			.query({series: '1.2.3.4.5'})
			.expect('Content-Type', 'application/json')
			.end(done);
	});

	it('must return volume', function (done) {
		supertest(httpServer)
			.get('/volume')
			.query({series: '1.2.3.4.5'})
			.expect('Content-Type', 'application/octet-stream')
			.end(done);
	});
});
