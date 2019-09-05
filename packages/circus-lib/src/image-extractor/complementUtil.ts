/**
 * Converts a given number with an arbitrary sign bit position
 * into an ordinary Int16.
 * @param input A number using 2's complement
 * @param flagBit Position of the flat bit (between 2 and 16)
 */
export const convertComplement16 = (input: number, flagBit: number) => {
  if (input & (1 << (flagBit - 1))) {
    // input is negative

    // for example, if flagBit == 5...
    // 00000000 00100000
    // 00000000 00011111
    const bitmask = (1 << flagBit) - 1; // 0b11111

    // 00000000 00011111 = -1
    // 00000000 00011110 : (input - 1)
    // 11111111 11100001 : ~(input - 1)
    // 00000000000000001 : ~(input - 1) & bitmask
    const abs = ~(input - 1) & bitmask;
    return -abs;
  } else {
    // input is nonnegative
    return input;
  }
};
