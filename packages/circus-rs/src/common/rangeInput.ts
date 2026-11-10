import * as mr from 'multi-integer-range';

/**
 * A set of integers in any of the forms accepted by the public APIs:
 * a string such as '1-5,8', a single integer, or an (unsorted) array of
 * integers and `[min, max]` tuples, which includes a normalized
 * `MultiIntegerRange`.
 */
export type RangeInput = string | number | Iterable<number | mr.Range>;

/**
 * Converts a `RangeInput` into a normalized `MultiIntegerRange`.
 */
export const toRange = (input: RangeInput): mr.MIR =>
  typeof input === 'string' ? mr.parse(input) : mr.normalize(input);
