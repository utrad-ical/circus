import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import ps from './parseSeries.ts';

describe('parseSeries', () => {
  test('simple UID check', () => {
    assert.deepEqual(ps('1.3.5'), {
      seriesUid: '1.3.5'
    });
  });

  test('wrong UID throws', () => {
    assert.throws(() => ps('1.x.5'), {
      message: /does not seem to be a valid DICOM UID/
    });
  });

  test('with partial volume descriptor', () => {
    assert.deepEqual(ps('1.3.5:50:100'), {
      seriesUid: '1.3.5',
      partialVolumeDescriptor: {
        start: 50,
        end: 100,
        delta: 1
      }
    });

    assert.deepEqual(ps('1.3.5:1:9:2'), {
      seriesUid: '1.3.5',
      partialVolumeDescriptor: {
        start: 1,
        end: 9,
        delta: 2
      }
    });
  });

  // test.skip('negative delta', () => {});
});
