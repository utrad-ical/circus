import { convertComplement16 } from './complementUtil';

test('convertComplement16', () => {
  expect(convertComplement16(10, 14)).toBe(10);
  expect(convertComplement16(0b11111111, 8)).toBe(-1);
  expect(convertComplement16(0b11011100, 8)).toBe(-36);

  expect(convertComplement16(0b0000000000000000, 14)).toBe(0);
  expect(convertComplement16(0b0000000000001111, 14)).toBe(15);
  expect(convertComplement16(0b0011111111111111, 14)).toBe(-1);
  expect(convertComplement16(0b0011111111111110, 14)).toBe(-2);
  expect(convertComplement16(0b0011111111111101, 14)).toBe(-3);
});
