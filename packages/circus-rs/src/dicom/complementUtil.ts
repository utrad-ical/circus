/**
 * Converts a given number with an arbitrary sign bit position
 * into an ordinary (signed) JavaScript integer.
 * For example, if `highBit` is 6 and `bitsStores` = 5,
 * the number is stored like `0bxSNNNNxx`, where `S` is the sign bit
 * and `x` is the unused bits, which will be ignored.
 * @param input A number using 2's complement
 * @param bitsStored DICOM "Bits Stored" value,
 * which describes how many bits are used to represent a number,
 * counting from `highBit` (between 2 to `highBit` + 1).
 * @param highBit DICOM "High Bit" value,
 * which is the position of the sign bit (between 0 and 31)
 */
export const convertComplement = (
  input: number,
  bitsStored: number,
  highBit: number
) => {
  // for example, if highBit == 6, bitsStored = 5, input = 0x1111100,
  // the function must return -1.

  // Remove unused low bits (01111100 => 00011111)
  input = input >> (highBit - bitsStored + 1);

  // 00100000 : 1 << bitsStored
  // 00011111 : (1 << bitsStored) - 1
  const bitmask = (1 << bitsStored) - 1;

  // Check the high (i.e., sign) bit
  // 000S0000
  if (input & (1 << (bitsStored - 1))) {
    // Input is negative

    // 00011111 (= -1)
    // 00011110 : (input - 1)
    // 11100001 : ~(input - 1)
    // 00000001 : ~(input - 1) & bitmask
    const abs = ~(input - 1) & bitmask;
    return -abs;
  } else {
    // input is non-negative
    return input & bitmask;
  }
};
