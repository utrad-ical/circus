import generateUniqueId from './generateUniqueId';

test('generateUniqueId', () => {
  const result = generateUniqueId();
  expect(result).toMatch(/^[a-z0-9]{26}$/);
});
