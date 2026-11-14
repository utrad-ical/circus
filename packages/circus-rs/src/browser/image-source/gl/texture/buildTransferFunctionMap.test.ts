import assert from 'node:assert/strict';
import { test } from 'node:test';
import buildTransferFunctionMap from './buildTransferFunctionMap.ts';

test('interpolates between entries', () => {
  const map = buildTransferFunctionMap(
    [
      { position: 0, color: '#00000000' },
      { position: 1, color: '#ffffffff' }
    ],
    2
  );
  assert.deepEqual([...map], [0, 0, 0, 0, 128, 128, 128, 128]);
});

test('accepts short and opaque hex colors', () => {
  const map = buildTransferFunctionMap(
    [
      { position: 0, color: '#f80' },
      { position: 1, color: '#f80' }
    ],
    1
  );
  assert.deepEqual([...map], [255, 136, 0, 255]);
});

test('rejects non-hex colors', () => {
  assert.throws(
    () =>
      buildTransferFunctionMap([
        { position: 0, color: 'red' },
        { position: 1, color: 'blue' }
      ]),
    TypeError
  );
});
