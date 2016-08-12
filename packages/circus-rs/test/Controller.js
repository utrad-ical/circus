'use strict';

var Controller = require('../lib/server/controllers/Controller').default;
var assert = require('chai').assert;

describe('Controller', function() {
	it('must check valid UID', function() {
		var ctl = new Controller();
		assert.isTrue(ctl.isUID('0.0.1'));
		assert.isTrue(ctl.isUID('2.3.231.2345.33.888'));
		assert.isTrue(ctl.isUID('1111.2222.3333.4444.5555.6666.7777.8888.9999'));
		assert.isFalse(ctl.isUID('0.0.1x'));
		assert.isFalse(ctl.isUID('.1.2'));
		assert.isFalse(ctl.isUID('1.5.'));
		assert.isFalse(ctl.isUID('1111.222.333..4.5.6'));
		var uid64 = '1.'.repeat(31) + '2'
		assert.isTrue(ctl.isUID(uid64));
		assert.isFalse(ctl.isUID(uid64 + '.3333'));
	});
});
