var Server = require('../lib/server/Server').default;
var supertest = require('supertest');
var moduleLoader = require('../lib/server/ModuleLoader');

var config = {
	dicomFileRepository: {
		module: "StaticDicomFileRepository",
		options: { dataDir: __dirname, useHash: false }
	},
	port: 1024,
	logs: [],
	dumper: { module: "MockDicomDumper", options: { depth: 5 } },
	imageEncoder: { module: "ImageEncoder_pngjs", options: {} },
	cache: { memoryThreshold: 2147483648 },
	authorization: { require: false, allowFrom: "127.0.0.1", expire: 1800 }
};

describe('Server', function() {
	var server;
	var httpServer;

	beforeEach(function(done) {
		server = new Server(
			moduleLoader.loadModule(moduleLoader.ModuleType.ImageEncoder, config.imageEncoder),
			moduleLoader.loadModule(moduleLoader.ModuleType.DicomFileRepository, config.dicomFileRepository),
			moduleLoader.loadModule(moduleLoader.ModuleType.DicomDumper, config.dumper),
			config
		);
		server.start();
		httpServer = server.getServer();
		httpServer.on('listening', done);
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
			.expect('Content-Type', 'application/json')
			.expect(/Running/)
			.end(done);
	});

	it('must return metadata', function(done) {
		supertest(httpServer)
			.get('/metadata')
			.query({ series: '1.2.3.4.5' })
			.expect(200)
			.expect('Content-Type', 'application/json')
			.end(done);
	});

	it('must return volume', function(done) {
		supertest(httpServer)
			.get('/volume')
			.query({ series: '1.2.3.4.5' })
			.expect(200)
			.expect('Content-Type', 'application/octet-stream')
			.end(done);
	});

	it('must return oblique image in binary format', function(done) {
		supertest(httpServer)
			.get('/scan')
			.query({
				series: '1.2.3.4.5',
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
		supertest(httpServer)
			.get('/scan')
			.query({
				series: '1.2.3.4.5',
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

});
