import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { EJSON } from 'bson';
import { z } from 'zod';
import { validate } from '../createValidator.ts';
import { dateField } from './formats.ts';
import { fieldsOf, mongoFilter } from './mongoFilter.ts';

const person = z.strictObject({
  name: z.string().max(3),
  age: z.number(),
  valid: z.boolean(),
  tags: z.array(z.string()),
  birthday: dateField(),
  info: z.strictObject({ sex: z.enum(['F', 'M']).optional() }).optional()
});

const filter = mongoFilter(
  fieldsOf(person, ['name', 'age', 'valid', 'tags', 'birthday', 'info.sex'])
);

const isValid = (data: unknown) => {
  try {
    validate(filter, data, 'check');
    return true;
  } catch {
    return false;
  }
};

const ejson = (text: string) => EJSON.parse(text);

describe('mongoFilter', () => {
  test('values and operators', () => {
    assert.ok(isValid({}));
    assert.ok(isValid({ age: 5, name: 'Alice' }));
    assert.ok(isValid({ age: { $gt: 5, $lt: 7 } }));
    assert.ok(isValid({ valid: true }));
    assert.ok(isValid({ name: { $in: ['Alice', 'Bob'] } }));
    assert.ok(isValid({ tags: 'a' }));
    assert.ok(isValid({ tags: { $all: ['a', 'b'] } }));
    assert.ok(isValid({ 'info.sex': 'F' }));
    assert.ok(!isValid({ sex: 'F' }), 'unknown property');
    assert.ok(!isValid({ age: { $gg: 5 } }), 'unknown operator');
    assert.ok(!isValid({ age: { $where: 'true' } }), 'unknown operator');
  });

  test('strings are not checked by their formats', () => {
    assert.ok(isValid({ name: 'Too long' }));
  });

  test('values are checked by the property', () => {
    assert.ok(!isValid({ age: '5' }));
    assert.ok(!isValid({ age: { $in: [1, 'x'] } }));
    assert.ok(!isValid({ 'info.sex': 'X' }));
    assert.ok(!isValid({ birthday: '2015-11-11' }), 'a date must be $date');
    assert.ok(!isValid({ name: { $in: 'Alice' } }), '$in takes an array');
  });

  test('$and and $or', () => {
    assert.ok(isValid({ age: 12, $and: [{ name: 'Alice' }] }));
    assert.ok(isValid({ $or: [{ age: 1 }, { $and: [{ valid: false }] }] }));
    assert.ok(!isValid({ $or: { age: 1 } }));
    assert.ok(!isValid({ $or: [{ age: 'x' }] }));
  });

  test('dates and regular expressions in EJSON', () => {
    assert.ok(isValid({ birthday: new Date() }));
    assert.ok(
      isValid(ejson('{"birthday":{"$lt":{"$date":"2015-11-11T00:22:33Z"}}}'))
    );
    assert.ok(isValid(ejson('{"name":{"$regex":"^An"}}')));
    assert.ok(!isValid(ejson('{"age":{"$regex":"^1"}}')), 'not a string');
    assert.ok(!isValid({ name: /Bob/ }), 'only EJSON regular expressions');
  });

  test('fieldsOf rejects unknown properties', () => {
    assert.throws(() => fieldsOf(person, ['info.weight']), /No such property/);
  });
});
