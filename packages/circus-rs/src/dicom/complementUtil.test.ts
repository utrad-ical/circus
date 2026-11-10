import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { convertComplement } from './complementUtil.ts';

describe('convertComplement', () => {
  // S: sign bit = high bit
  // N: remaining significant bits
  // x: unused bits (must be ignored)
  test('bitsStored = 2, highBit = 1', () => {
    assert.equal(convertComplement(0b00, 2, 1), 0);
    assert.equal(convertComplement(0b01, 2, 1), 1);
    assert.equal(convertComplement(0b10, 2, 1), -2);
    assert.equal(convertComplement(0b11, 2, 1), -1);
    //                         SN
  });
  test('bitsStored = 2, highBit = 3', () => {
    assert.equal(convertComplement(0b1000, 2, 3), -2);
    assert.equal(convertComplement(0b1100, 2, 3), -1);
    //                         SNxx
  });
  test('bitsStored = 8, highBit = 7', () => {
    assert.equal(convertComplement(0b11111111, 8, 7), -1);
    assert.equal(convertComplement(0b11011100, 8, 7), -36);
    //                         SNNNNNNN
  });
  test('bitsStored = 14, highBit = 13', () => {
    assert.equal(convertComplement(0b0000000000000000, 14, 13), 0);
    assert.equal(convertComplement(0b0000000000001111, 14, 13), 15);
    assert.equal(convertComplement(0b0011111111111111, 14, 13), -1);
    assert.equal(convertComplement(0b0011111111111110, 14, 13), -2);
    assert.equal(convertComplement(0b0011111111111101, 14, 13), -3);
    //                           SNNNNNNNNNNNNN
  });
  test('ignore unused bits', () => {
    assert.equal(convertComplement(0b111111000, 2, 3), -2);
    //                         xxxxxSNxx
    assert.equal(convertComplement(0b1011, 2, 3), -2);
    //                         SNxx
  });
});
