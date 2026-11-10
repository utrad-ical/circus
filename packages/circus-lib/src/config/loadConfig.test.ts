import assert from 'node:assert/strict';
import { test } from 'node:test';
import loadConfig from './loadConfig.ts';
import path from 'path';

test('with defaults', () => {
  const result = loadConfig(
    [path.join(__dirname, '../../testdata/config/default')],
    'dummy'
  );
  assert.deepEqual(result, { a: 10, c: 'cat' });
});

test('with defaults and custom config', () => {
  const result = loadConfig(
    [path.join(__dirname, '../../testdata/config/default')],
    'custom',
    { searchFrom: path.join(__dirname, '../../testdata/config') }
  );
  assert.deepEqual(result, { a: 50, b: 'banana', c: 'cat' });
});

test('ES module config file (.mjs)', () => {
  const result = loadConfig(
    [path.join(__dirname, '../../testdata/config/default')],
    'custom',
    { searchFrom: path.join(__dirname, '../../testdata/config/esm') }
  );
  assert.deepEqual(result, { a: 70, b: 'esm', c: 'cat' });
});

test('CommonJS config file (.cjs)', () => {
  const result = loadConfig(
    [path.join(__dirname, '../../testdata/config/default')],
    'custom',
    { searchFrom: path.join(__dirname, '../../testdata/config/cjs') }
  );
  assert.deepEqual(result, { a: 80, b: 'cjs', c: 'cat' });
});

test('empty', () => {
  const result = loadConfig([], 'dummy');
  assert.deepEqual(result, {});
});
