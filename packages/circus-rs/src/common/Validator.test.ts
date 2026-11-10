import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Validator } from './Validator.ts';

describe('Validator', () => {
  test('must process string rule', () => {
    const v = new Validator({
      fruit: ['Fruit', null, 'isLength:1:5|contains:a', null]
    });
    assert.equal(v.validate({ fruit: 'apple' }).result.fruit, 'apple');
    assert.equal(v.validate({ fruit: 'banana' }).result, null);
  });

  test('must process regex rule', () => {
    const v = new Validator({
      fruit: ['Fruit', null, /a/, null]
    });
    assert.equal(v.validate({ fruit: 'apple' }).result.fruit, 'apple');
    assert.equal(v.validate({ fruit: 'melon' }).result, null);
  });

  test('must process callback rule', () => {
    const v = new Validator({
      fruit: [
        'Fruit',
        null,
        function (t) {
          return /a/.test(t);
        },
        null
      ]
    });
    assert.equal(v.validate({ fruit: 'apple' }).result.fruit, 'apple');
    assert.equal(v.validate({ fruit: 'melon' }).result, null);
  });

  test('must pass through input for "null" rule', () => {
    const v = new Validator({ fruit: ['Fruit', null, null, null] });
    assert.equal(v.validate({ fruit: 'apple' }).result.fruit, 'apple');
  });

  test('must return default value only if key is not set', () => {
    const v = new Validator({ fruit: ['Fruit', 'orange', () => true, null] });
    assert.equal(v.validate({ fruit: 'apple' }).result.fruit, 'apple');
    assert.equal(v.validate({ fruit: '' }).result.fruit, '');
    assert.equal(v.validate({ fruit: null }).result.fruit, null);
    assert.equal(v.validate({}).result.fruit, 'orange');
  });

  test('must sanitize input value', () => {
    const v1 = new Validator({
      fruit: ['Fruit', null, null, 'escape|trim']
    });
    assert.equal(v1.validate({ fruit: ' 2 >= 1\t' }).result.fruit, '2 &gt;= 1');
    const v2 = new Validator({
      fruit: ['Fruit', null, null, (s: string) => s.toUpperCase()]
    });
    assert.equal(v2.validate({ fruit: 'apple' }).result.fruit, 'APPLE');
  });

  test('must return null result for invalid input', () => {
    const v = new Validator({
      fruit: ['Fruit', null, 'isLength:1:5', null]
    });
    assert.equal(v.validate({ fruit: 'banana' }).result, null);
  });
});
