import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { attributesSchemaOf, jsonSchemaSubset } from './jsonSchemaSubset.ts';

const schema = attributesSchemaOf({
  type: 'object',
  properties: {
    comment: { type: 'string', minLength: 1, maxLength: 5 },
    code: { type: 'string', pattern: '^[A-Z]+$' },
    size: { type: 'number', minimum: 0, exclusiveMaximum: 10 },
    count: { type: 'integer', exclusiveMinimum: 0, maximum: 3 },
    smoker: { type: 'boolean' },
    location: { enum: ['MCA', 'ACA'] },
    grade: { type: 'number', enum: [1, 2, 3] }
  },
  required: ['smoker']
});

const isValid = (value: unknown) => schema.safeParse(value).success;

describe('attributesSchemaOf', () => {
  test('required and optional attributes', () => {
    assert.ok(isValid({ smoker: false }));
    assert.ok(!isValid({}));
    assert.ok(!isValid({ smoker: 'no' }));
  });

  test('strings', () => {
    assert.ok(isValid({ smoker: true, comment: 'abc' }));
    assert.ok(!isValid({ smoker: true, comment: '' }));
    assert.ok(!isValid({ smoker: true, comment: 'abcdef' }));
    assert.ok(isValid({ smoker: true, code: 'ABC' }));
    assert.ok(!isValid({ smoker: true, code: 'abc' }));
  });

  test('numbers', () => {
    assert.ok(isValid({ smoker: true, size: 0, count: 3 }));
    assert.ok(isValid({ smoker: true, size: 9.5 }));
    assert.ok(!isValid({ smoker: true, size: 10 }));
    assert.ok(!isValid({ smoker: true, size: -1 }));
    assert.ok(!isValid({ smoker: true, count: 0 }));
    assert.ok(!isValid({ smoker: true, count: 1.5 }));
  });

  test('options', () => {
    assert.ok(isValid({ smoker: true, location: 'MCA', grade: 2 }));
    assert.ok(!isValid({ smoker: true, location: 'ICA' }));
    assert.ok(!isValid({ smoker: true, grade: 4 }));
  });

  test('options with the other keywords', () => {
    const s = attributesSchemaOf({
      properties: {
        grade: { type: 'number', enum: [1, 2], minimum: 2 },
        text: { type: 'string', enum: [1, 'a'] }
      }
    });
    assert.ok(s.safeParse({ grade: 2, text: 'a' }).success);
    assert.ok(!s.safeParse({ grade: 1 }).success);
    assert.ok(!s.safeParse({ text: 1 }).success);
  });

  test('required attributes not in the properties', () => {
    const s = attributesSchemaOf({ properties: {}, required: ['smoker'] });
    assert.ok(s.safeParse({ smoker: 'anything' }).success);
    assert.ok(!s.safeParse({}).success);
    // An untyped attribute
    const t = attributesSchemaOf({ properties: { a: {} }, required: ['a'] });
    assert.ok(t.safeParse({ a: 1 }).success);
    assert.ok(!t.safeParse({}).success);
  });

  test('unknown attributes are allowed', () => {
    assert.ok(isValid({ smoker: true, removedAttribute: 'anything' }));
  });
});

describe('jsonSchemaSubset', () => {
  const isValidSchema = (value: unknown) =>
    jsonSchemaSubset.safeParse(value).success;

  test('accepts what the web UI edits', () => {
    assert.ok(
      isValidSchema({
        type: 'object',
        properties: {
          a: { type: 'string', pattern: '^x', minLength: 0 },
          b: { enum: ['x', 'y'] },
          c: { type: 'number', enum: [1, 2], exclusiveMinimum: 0 }
        },
        required: []
      })
    );
  });

  test('rejects unknown or invalid keywords', () => {
    assert.ok(!isValidSchema({ properties: { a: { type: 'array' } } }));
    assert.ok(!isValidSchema({ properties: { a: { format: 'email' } } }));
    assert.ok(!isValidSchema({ properties: { a: { pattern: '(' } } }));
    assert.ok(!isValidSchema({ properties: { a: { maxLength: -1 } } }));
  });
});
