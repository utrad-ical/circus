import loadConfig from './loadConfig';
import path from 'path';

test('with defaults', () => {
  const result = loadConfig(
    [path.join(__dirname, '../../testdata/config/default')],
    'dummy'
  );
  expect(result).toEqual({ a: 10, c: 'cat' });
});

test('with defaults and custom config', () => {
  const result = loadConfig(
    [path.join(__dirname, '../../testdata/config/default')],
    'custom',
    { searchFrom: path.join(__dirname, '../../testdata/config') }
  );
  expect(result).toEqual({ a: 50, b: 'banana', c: 'cat' });
});

test('empty', () => {
  const result = loadConfig([], 'dummy');
  expect(result).toEqual({});
});
