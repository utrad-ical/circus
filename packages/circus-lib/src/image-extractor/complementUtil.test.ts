import { convertComplement } from './complementUtil';

describe('convertComplement', () => {
  // S: sign bit = high bit
  // N: remaining significant bits
  // x: unused bits (must be ignored)
  test('bitsStored = 2, highBit = 1', () => {
    expect(convertComplement(0b00, 2, 1)).toBe(0);
    expect(convertComplement(0b01, 2, 1)).toBe(1);
    expect(convertComplement(0b10, 2, 1)).toBe(-2);
    expect(convertComplement(0b11, 2, 1)).toBe(-1);
    //                         SN
  });
  test('bitsStored = 2, highBit = 3', () => {
    expect(convertComplement(0b1000, 2, 3)).toBe(-2);
    expect(convertComplement(0b1100, 2, 3)).toBe(-1);
    //                         SNxx
  });
  test('bitsStored = 8, highBit = 7', () => {
    expect(convertComplement(0b11111111, 8, 7)).toBe(-1);
    expect(convertComplement(0b11011100, 8, 7)).toBe(-36);
    //                         SNNNNNNN
  });
  test('bitsStored = 14, highBit = 13', () => {
    expect(convertComplement(0b0000000000000000, 14, 13)).toBe(0);
    expect(convertComplement(0b0000000000001111, 14, 13)).toBe(15);
    expect(convertComplement(0b0011111111111111, 14, 13)).toBe(-1);
    expect(convertComplement(0b0011111111111110, 14, 13)).toBe(-2);
    expect(convertComplement(0b0011111111111101, 14, 13)).toBe(-3);
    //                           SNNNNNNNNNNNNN
  });
  test('ignore unused bits', () => {
    expect(convertComplement(0b111111000, 2, 3)).toBe(-2);
    //                         xxxxxSNxx
    expect(convertComplement(0b1011, 2, 3)).toBe(-2);
    //                         SNxx
  });
});
