import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import checkFilter from './checkFilter.ts';
import { EJSON } from 'bson';

const fields = ['age', 'name', 'dept', 'valid', 'birthday'];

describe('checkFilter', () => {
  test('normal scalar types', () => {
    assert.equal(checkFilter({ age: 5, name: 'Alice' }, fields), true);
    assert.equal(checkFilter({ age: { $gt: 5 } }, fields), true);
    assert.equal(checkFilter({ age: { $gt: 5, $lt: 7 } }, fields), true);
    assert.equal(
      checkFilter({ age: 12, $and: [{ name: 'Alice' }] }, fields),
      true
    );
    assert.equal(checkFilter({ valid: true }, fields), true);
    assert.equal(
      checkFilter({ name: { $in: ['Alice', 'Bob'] } }, fields),
      true
    );
    assert.equal(checkFilter({ name: { $all: ['Ann', 'Bob'] } }, fields), true);
    assert.equal(checkFilter({ sex: 'F' }, fields), false);
    assert.equal(checkFilter({ age: { $gg: 5 } }, fields), false);
    assert.equal(checkFilter({ name: /Bob/ }, fields), false);
  });

  test('dates and regexp', () => {
    assert.equal(checkFilter({ birthday: new Date() }, fields), true);
    assert.equal(
      checkFilter(
        EJSON.parse(
          '{"birthday":{"$lt":{"$date":"2015-11-11T00:22:33Z"}}}'
        ) as object,
        fields
      ),
      true
    );
    assert.equal(
      checkFilter(EJSON.parse('{"name":{"$regex":"^An"}}') as object, fields),
      true
    );
  });
});
