'use strict';

const v = require('../src/common/ValidatorRules');
const assert = require('chai').assert;

describe('ValidatorRules', function() {
  it('#isTuple', function() {
    const t3 = v.isTuple(3);
    assert.isTrue(t3('1,2,3'));
    assert.isTrue(t3('1.1,2.5,-3.8'));
    assert.isFalse(t3('1,2'));
    assert.isFalse(t3('1,,3'));
    assert.isFalse(t3('5'));
    assert.isFalse(t3(''));
  });

  it('#parseTuple', function() {
    let p3 = v.parseTuple(3, true);
    assert.deepEqual(p3('1,3,5'), [1, 3, 5]);
    assert.deepEqual(p3('1,-3,5.7'), [1, -3, 5]);
    p3 = v.parseTuple(3, false);
    assert.deepEqual(p3('1,3,5'), [1, 3, 5]);
    assert.deepEqual(p3('1.3,-3,5.7'), [1.3, -3, 5.7]);
  });

  it('#parseBoolean', function() {
    const b = v.parseBoolean;
    assert.isTrue(b('yes'));
    assert.isTrue(b('1'));
    assert.isTrue(b('true'));
    assert.isFalse(b('no'));
    assert.isFalse(b('0'));
    assert.isFalse(b('false'));
  });
});
