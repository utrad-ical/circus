import { round } from './FloatingPoint';

it('round', () => {
  expect(round(1.05, 1)).toBe(1.1);
  expect(round(1.005, 2)).toBe(1.01);
  expect(round(3456.3456, 3)).toBe(3456.346);
  expect(round(3456.3456, 2)).toBe(3456.35);
  expect(round(3456.3456, 1)).toBe(3456.3);
  expect(round(3456.3456, 0)).toBe(3456);
  expect(round(3456.3456, -1)).toBe(3460);
  expect(round(3456.3456, -2)).toBe(3500);
  expect(round(3456.3456, -3)).toBe(3000);
});
