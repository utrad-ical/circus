import isDicomUid from './isDicomUid';

test('isDicomUid', () => {
  expect(isDicomUid('1.2.3')).toBe(true);
  expect(isDicomUid('a')).toBe(false);
  expect(isDicomUid('1.22..5')).toBe(false);
});
