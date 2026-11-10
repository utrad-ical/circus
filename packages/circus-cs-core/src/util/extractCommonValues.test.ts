import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import extractCommonValues from './extractCommonValues.ts';

describe('extractCommonValues', () => {
  test('simple scalar', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 7, c: 8 },
      { a: 1, b: 8, c: 8 }
    ];
    const output = {
      common: { a: 1, c: 8 },
      unique: [{ b: 5 }, { b: 7 }, { b: 8 }]
    };
    assert.deepEqual(extractCommonValues(input), output);
  });

  test('all common values', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 5, c: 8 }
    ];
    const output = {
      common: { a: 1, b: 5, c: 8 },
      unique: [{}, {}, {}]
    };
    assert.deepEqual(extractCommonValues(input), output);
  });

  test('preserve input', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 2, b: 5, c: 8 },
      { a: 3, b: 5, c: 8 }
    ];
    const output = {
      common: { b: 5, c: 8 },
      unique: [{ a: 1 }, { a: 2 }, { a: 3 }]
    };
    assert.deepEqual(extractCommonValues(input), output);
    assert.deepEqual(input, [
      { a: 1, b: 5, c: 8 },
      { a: 2, b: 5, c: 8 },
      { a: 3, b: 5, c: 8 }
    ]);
  });

  test('all unique values', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 1, c: 4 },
      { a: 2, b: 1, c: 8 }
    ];
    const output = {
      common: {},
      unique: [
        { a: 1, b: 5, c: 8 },
        { a: 1, b: 1, c: 4 },
        { a: 2, b: 1, c: 8 }
      ]
    };
    assert.deepEqual(extractCommonValues(input), output);
  });

  test('no input', () => {
    const input: object[] = [];
    const output = { common: {}, unique: [{}] };
    assert.deepEqual(extractCommonValues(input), output);
  });

  test('has nested values', () => {
    const input = [
      { a: 1, b: 5, c: ['z', 'y'], d: { x: 1 }, e: { w: 'w' } },
      { a: 1, b: 7, c: ['z', 'y'], d: { x: 1 }, e: { w: '' } }
    ];
    const output = {
      common: { a: 1, c: ['z', 'y'], d: { x: 1 } },
      unique: [
        { b: 5, e: { w: 'w' } },
        { b: 7, e: { w: '' } }
      ]
    };
    assert.deepEqual(extractCommonValues(input), output);
  });
});
