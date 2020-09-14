import { Decimal } from 'decimal.js';
/**
 * Round a floating point number with precision.
 * https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/round#A_better_solution
 * @param value
 * @param precision
 */
export function round(value: number, precision: number): number {
  const shift = (number: number, precision: number, reverseShift: boolean) => {
    if (reverseShift) {
      precision = -precision;
    }
    const numArray = ('' + number).split('e');
    return +(
      numArray[0] +
      'e' +
      (numArray[1] ? +numArray[1] + precision : precision)
    );
  };
  return shift(Math.round(shift(value, precision, false)), precision, true);
}

export function divide(dividend: number, divisor: number): number {
  const _dividend = new Decimal(dividend);
  const _divisor = new Decimal(divisor);
  return _dividend.div(_divisor).toNumber();
}
