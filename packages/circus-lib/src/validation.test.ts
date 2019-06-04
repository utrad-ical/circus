import { isDicomUid } from './validation';

test('isDicomUid', () => {
  expect(isDicomUid('')).toBe(false);
  expect(isDicomUid('1111.222..8')).toBe(false);
  expect(isDicomUid('11118')).toBe(false);
  expect(isDicomUid('1.3333.'.repeat(10) + '555')).toBe(false);
  expect(isDicomUid('1.3333.55555')).toBe(true);
  expect(isDicomUid('1.3333.00.55555')).toBe(true);
  expect(isDicomUid('1.3333.00.55555', true)).toBe(false);
});
