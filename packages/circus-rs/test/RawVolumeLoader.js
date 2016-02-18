'use strict';

var RawDataLoader = require('../build/browser/image-source/rawvolume-loader').default;
var Server = require('../build/server/Server');
var assert = require('chai').assert;

var port = 9999;

var defaultConfig = {
	pathResolver: {
		module: "StaticPathResolver",
		options: {dataDir: __dirname, useHash: false}
	},
	port: port,
	logs: [],
	dumper: {module: "MockDicomDumper", options: { depth: 5 }},
	imageEncoder: {module: "ImageEncoder_pngjs", options: {}},
	cache: {memoryThreshold: 2147483648},
	authorization: {require: false, allowFrom: "127.0.0.1", expire: 1800}
};

describe('RawVolumeLoader', function() {
	var loader;
	var server;
	beforeEach(function() {
		loader = new RawDataLoader({ server: 'http://localhost:' + port });
		server = new Server(defaultConfig);
		server.start();
	});

	afterEach(function (done) {
		server.close().then(done);
	});

	it('must reject with 400 for bad request', function(done) {
		loader.loadVolume('malformed-series-uid')
		.then(function() {
			done('Unexpectedly resolved');
		})
		.catch(function(err) {
			if (err.status === 400) {
				done();
			} else {
				done('Server responded with an error other than 400');
			}
		});
	});

	it('must load valid DICOM data', function(done) {
		loader.loadVolume('1.2.3.4.5')
		.then(function(volume) {
			assert.deepEqual(volume.getDimension(), [512, 512, 5]);
			done();
		})
		.catch(function(err) {
			done(err);
		});
	});
});
