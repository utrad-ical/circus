import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor,
  isValidPartialVolumeDescriptor
} from './PartialVolumeDescriptor';

test('describePartialVolumeDescriptor', () => {
  const a: PartialVolumeDescriptor = { start: 1, end: 11, delta: 2 };
  expect(describePartialVolumeDescriptor(a)).toBe('1, 3, 5, ..., 11');
  expect(describePartialVolumeDescriptor(a, 3)).toBe('1, 3, ..., 11');
  expect(describePartialVolumeDescriptor(a, 5)).toBe('1, 3, 5, 7, ..., 11');
  expect(describePartialVolumeDescriptor(a, 10)).toBe('1, 3, 5, 7, 9, 11');
  expect(describePartialVolumeDescriptor({ start: 1, end: 0, delta: 1 })).toBe(
    'Invalid'
  );
});

test('isValidPartialVolumeDescriptor', () => {
  const c = (bool: boolean, start: number, end: number, delta: number) => {
    expect(isValidPartialVolumeDescriptor({ start, end, delta })).toBe(bool);
  };
  const shouldBeTrue = c.bind(null, true);
  const shouldBeFalse = c.bind(null, false);
  shouldBeFalse(3, 1, 1);
  shouldBeFalse(0, 6, 1);
  shouldBeFalse(2, 0, 2);
  shouldBeFalse(3, 6, 0);
  shouldBeFalse(1, 6, 2);
  shouldBeTrue(1, 3, 1);
  shouldBeTrue(1, 11, 5);
  shouldBeTrue(5, 5, 1);
});
