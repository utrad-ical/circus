import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { jsonSchemaSubset } from './jsonSchemaSubset.ts';

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
