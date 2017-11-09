'use strict';

var Log4JsLogger = require('../src/server/loggers/Log4JsLogger').default;
var assert = require('chai').assert;
var path = require('path');
var fs = require('fs');

describe('Log4JsLogger', function() {
	var file = path.resolve(__dirname, 'test-log.log');

	it('should write log file', function(done) {
		var logger = new Log4JsLogger({
			appenders: [{
				type: 'file',
				filename: file
			}]
		});
		logger.trace('foobar');
		logger.debug('foobar');
		logger.info('foobar');
		logger.warn('foobar');
		logger.error('foobar');
		logger.fatal('foobar');
		logger.shutdown().then(() => {
			try {
				assert.isTrue(fs.existsSync(file));
				done();
			} catch(e) {
				done(e);
			}
		});
	});

	beforeEach(function(done) {
		fs.unlink(file, err => done());
	});

	afterEach(function(done) {
		fs.unlink(file, err => done());
	});
});
