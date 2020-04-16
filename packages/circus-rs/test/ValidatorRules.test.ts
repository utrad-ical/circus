import * as vr from '../src/common/ValidatorRules';

it('#isTuple', () => {
  const t3 = vr.isTuple(3);
  expect(t3('1,2,3')).toBe(true);
  expect(t3('1.1,2.5,-3.8')).toBe(true);
  expect(t3('1,2')).toBe(false);
  expect(t3('1,,3')).toBe(false);
  expect(t3('5')).toBe(false);
  expect(t3('')).toBe(false);
});

it('#parseTuple', () => {
  let p3 = vr.parseTuple(3, true);
  expect(p3('1,3,5')).toEqual([1, 3, 5]);
  expect(p3('1,-3,5.7')).toEqual([1, -3, 5]);
  p3 = vr.parseTuple(3, false);
  expect(p3('1,3,5')).toEqual([1, 3, 5]);
  expect(p3('1.3,-3,5.7')).toEqual([1.3, -3, 5.7]);
});

it('#parseBoolean', () => {
  const b = vr.parseBoolean;
  expect(b('yes')).toBe(true);
  expect(b('1')).toBe(true);
  expect(b('true')).toBe(true);
  expect(b('no')).toBe(false);
  expect(b('0')).toBe(false);
  expect(b('false')).toBe(false);
});
