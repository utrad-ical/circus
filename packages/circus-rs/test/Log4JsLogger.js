'use strict';

const Log4JsLogger = require('../src/server/loggers/Log4JsLogger').default;
const assert = require('chai').assert;
const path = require('path');
const fs = require('fs');

describe('Log4JsLogger', function() {
  const file = path.resolve(__dirname, 'test-log.log');

  it('should write log file', function(done) {
    const logger = new Log4JsLogger({
      appenders: [
        {
          type: 'file',
          filename: file
        }
      ]
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
      } catch (e) {
        done(e);
      }
    });
  });

  beforeEach(function(done) {
    fs.unlink(file, () => done());
  });

  afterEach(function(done) {
    fs.unlink(file, () => done());
  });
});
