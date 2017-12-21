'use strict';

var v = require('../src/common/ValidatorRules');
var assert = require('chai').assert;

describe('ValidatorRules', function() {
  it('#isUID', function() {
    assert.isTrue(v.isUID('0.0.1'));
    assert.isTrue(v.isUID('2.3.231.2345.33.888'));
    assert.isTrue(v.isUID('1111.2222.3333.4444.5555.6666.7777.8888.9999'));
    assert.isFalse(v.isUID('0.0.1x'));
    assert.isFalse(v.isUID('.1.2'));
    assert.isFalse(v.isUID('1.5.'));
    assert.isFalse(v.isUID('1111.222.333..4.5.6'));
    var uid64 = '1.'.repeat(31) + '2';
    assert.isTrue(v.isUID(uid64));
    assert.isFalse(v.isUID(uid64 + '.3333'));
  });

  it('#isTuple', function() {
    var t3 = v.isTuple(3);
    assert.isTrue(t3('1,2,3'));
    assert.isTrue(t3('1.1,2.5,-3.8'));
    assert.isFalse(t3('1,2'));
    assert.isFalse(t3('1,,3'));
    assert.isFalse(t3('5'));
    assert.isFalse(t3(''));
  });

  it('#parseTuple', function() {
    var p3 = v.parseTuple(3, true);
    assert.deepEqual(p3('1,3,5'), [1, 3, 5]);
    assert.deepEqual(p3('1,-3,5.7'), [1, -3, 5]);
    p3 = v.parseTuple(3, false);
    assert.deepEqual(p3('1,3,5'), [1, 3, 5]);
    assert.deepEqual(p3('1.3,-3,5.7'), [1.3, -3, 5.7]);
  });

  it('#parseBoolean', function() {
    var b = v.parseBoolean;
    assert.isTrue(b('yes'));
    assert.isTrue(b('1'));
    assert.isTrue(b('true'));
    assert.isFalse(b('no'));
    assert.isFalse(b('0'));
    assert.isFalse(b('false'));
  });
});
