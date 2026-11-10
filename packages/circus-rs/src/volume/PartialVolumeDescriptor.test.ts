import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type PartialVolumeDescriptor from './PartialVolumeDescriptor.ts';
import {
  describePartialVolumeDescriptor,
  isValidPartialVolumeDescriptor,
  rangeHasPartialVolume,
  partialVolumeDescriptorToArray
} from './PartialVolumeDescriptor.ts';
import * as mr from 'multi-integer-range';

describe('describePartialVolumeDescriptor', () => {
  const a: PartialVolumeDescriptor = { start: 1, end: 11, delta: 2 };
  const b: PartialVolumeDescriptor = { start: 5, end: 1, delta: -1 };
  const cases: [PartialVolumeDescriptor, number | undefined, string][] = [
    [a, undefined, '1, 3, 5, ..., 11'],
    [a, 3, '1, 3, ..., 11'],
    [a, 5, '1, 3, 5, 7, ..., 11'],
    [a, 10, '1, 3, 5, 7, 9, 11'],
    [b, 3, '5, 4, ..., 1'],
    [b, 10, '5, 4, 3, 2, 1'],
    [{ start: 1, end: 0, delta: 1 }, undefined, 'Invalid']
  ];
  for (const [pvd, count, expected] of cases) {
    test(`${JSON.stringify(pvd)}, ${count} -> ${expected}`, () => {
      assert.equal(describePartialVolumeDescriptor(pvd, count), expected);
    });
  }
});

describe('isValidPartialVolumeDescriptor', () => {
  const cases: [number, number, number, boolean][] = [
    [1, 3, 1, true],
    [1, 11, 5, true],
    [5, 5, 1, true],
    [5, 1, -1, true],
    [3, 1, 1, false],
    [0, 6, 1, false],
    [2, 0, 2, false],
    [3, 6, 0, false],
    [1, 6, 2, false],
    [6, 1, -2, false],
    [7, 7, -1, false]
  ];
  for (const [start, end, delta, expected] of cases) {
    test(`(${start}, ${end}, ${delta}) should be ${expected}`, () => {
      assert.equal(
        isValidPartialVolumeDescriptor({ start, end, delta }),
        expected
      );
    });
  }
});

describe('rangeHasPartialVolume', () => {
  const cases: [string, number, number, number, boolean][] = [
    ['1-50', 1, 5, 1, true],
    ['1-50', 1, 5, 2, true],
    ['1-50', 10, 70, 1, false],
    ['1-50', 10, 70, 2, false],
    ['1-50', 3, 1, -1, true],
    ['1-50', 70, 10, -1, false],
    ['1,3,5,7,9', 1, 9, 2, true],
    ['1,3,5,7,9', 9, 1, -2, true],
    ['1,3,9', 1, 9, 1, false],
    ['1,3,9', 1, 9, 2, false],
    ['1,3,9', 9, 1, -2, false]
  ];
  for (const [range, start, end, delta, expected] of cases) {
    test(`'${range}' in (${start}, ${end}, ${delta}) should be ${expected}`, () => {
      const images = mr.parse(range);
      assert.equal(
        rangeHasPartialVolume(images, { start, end, delta }),
        expected
      );
    });
  }

  test('invalid PVD throws', () => {
    assert.throws(
      () =>
        rangeHasPartialVolume(mr.parse('1-100'), {
          start: 1,
          end: 10,
          delta: 2
        }),
      { message: /Invalid/ }
    );
  });
});

describe('partialVolumeDescriptorToArray', () => {
  const cases: [number, number, number, number[]][] = [
    [1, 5, 2, [1, 3, 5]],
    [5, 1, -2, [5, 3, 1]]
  ];
  for (const [start, end, delta, expected] of cases) {
    test(`partialVolumeDescriptorToArray (${start}, ${end}, ${delta})`, () => {
      const pvd = { start, end, delta };
      assert.deepEqual(partialVolumeDescriptorToArray(pvd), expected);
    });
  }
});
