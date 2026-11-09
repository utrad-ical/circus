import generateUniqueId from './generateUniqueId.ts';

test('generateUniqueId', () => {
  const result = generateUniqueId();
  expect(result).toMatch(/^[a-z0-9]{26}$/);
});
