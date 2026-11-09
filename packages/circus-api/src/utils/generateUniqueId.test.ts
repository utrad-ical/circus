import generateUniqueId from './generateUniqueId.ts';

it('generateUniqueId', () => {
  const id = generateUniqueId();
  expect(id).toMatch(/^[0-9a-z]{26}$/);
});
