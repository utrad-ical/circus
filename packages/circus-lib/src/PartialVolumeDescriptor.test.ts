import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor,
  isValidPartialVolumeDescriptor
} from './PartialVolumeDescriptor';

describe('describePartialVolumeDescriptor', () => {
  const a: PartialVolumeDescriptor = { start: 1, end: 11, delta: 2 };
  const b: PartialVolumeDescriptor = { start: 5, end: 1, delta: -1 };
  test.each([
    [a, undefined, '1, 3, 5, ..., 11'],
    [a, 3, '1, 3, ..., 11'],
    [a, 5, '1, 3, 5, 7, ..., 11'],
    [a, 10, '1, 3, 5, 7, 9, 11'],
    [b, 3, '5, 4, ..., 1'],
    [b, 10, '5, 4, 3, 2, 1'],
    [{ start: 1, end: 0, delta: 1 }, undefined, 'Invalid']
  ])('%s, %s -> %s', (pvd, count, expected) => {
    expect(describePartialVolumeDescriptor(pvd, count)).toBe(expected);
  });
});

describe('isValidPartialVolumeDescriptor', () => {
  test.each([
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
  ])('(%p, %p, %p) should be %p', (start, end, delta, expected) => {
    expect(isValidPartialVolumeDescriptor({ start, end, delta })).toBe(
      expected
    );
  });
});
