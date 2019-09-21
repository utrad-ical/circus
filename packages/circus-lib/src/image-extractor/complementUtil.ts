/**
 * Converts a given number with an arbitrary high bit position
 * into an ordinary Int16.
 * @param input A number using 2's complement
 * @param bitsStored DICOM Bits Stored,
 * which describes how many bits are used,
 * counting from `highBit` (between 1 to `highBit` + 1).
 * @param highBit DICOM High Bit,
 * which is the position of the sign bit (between 1 and 32)
 */
export const convertComplement = (
  input: number,
  bitsStored: number,
  highBit: number
) => {
  // for example, if highBit == 6 and bitsStored = 5...
  // The number is stored like 0SNNNN00, where S is the sign bit

  // Remove unused low bits (0SNNNN00 => 000SNNNN)
  input = input >> (highBit - bitsStored + 1);

  // 00100000 : 1 << bitsStored
  // 00011111 : (1 << bitsStored) - 1
  const bitmask = (1 << bitsStored) - 1;

  // Check the high (i.e., sing) bit.
  // 000SNNNN
  if (input & (1 << (bitsStored - 1))) {
    // input is negative

    // 00011111 = -1
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
