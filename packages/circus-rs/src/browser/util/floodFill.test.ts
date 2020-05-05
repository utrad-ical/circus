import floodFill, { BinaryArray2D } from './floodFill';
import { Vector2 } from 'three';

const t = (
  pattern: string,
  start: number[],
  expectedPattern: string,
  expectedFillCount: number
) => {
  const rows = pattern.replace(/\n$/, '').split(/\n/);
  const width = Math.max.apply(
    Math,
    rows.map(r => r.length)
  );
  const arr = new BinaryArray2D(width, rows.length);
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < width; x++) {
      if (rows[y][x] === '*') arr.set(true, new Vector2(x, y));
    }
  }
  const filled = floodFill(arr, new Vector2().fromArray(start));
  expect(arr.toString()).toBe(expectedPattern);
  expect(filled).toBe(expectedFillCount);
};

test('must flood-fill a closed area correctly', () => {
  const pat = '*****\n' + '*   *\n'.repeat(3) + '*****';
  t(pat, [3, 3], '*****\n'.repeat(5), 9);
});

test('must flood-fill a complexed cloed area', () => {
  const pat =
    '*******\n' +
    '*     *\n' +
    '* *** *\n' +
    '* * * *\n' +
    '* * * *\n' +
    '* *   *\n' +
    '* *****';
  t(pat, [3, 3], '*******\n'.repeat(7), 18);
  t(pat, [1, 1], '*******\n'.repeat(7), 18);
  t(pat, [1, 5], '*******\n'.repeat(7), 18);
  t(pat, [1, 6], '*******\n'.repeat(7), 18);
});

test('must flood-fill a ring-like closed area', () => {
  const pat =
    '********\n' +
    '*      *\n' +
    '* **** *\n' +
    '* *  * *\n' +
    '* **** *\n' +
    '*      *\n' +
    '********\n';
  const outFilled =
    '********\n' +
    '********\n' +
    '********\n' +
    '***  ***\n' +
    '********\n' +
    '********\n' +
    '********\n';
  const inFilled =
    '********\n' +
    '*      *\n' +
    '* **** *\n' +
    '* **** *\n' +
    '* **** *\n' +
    '*      *\n' +
    '********\n';

  t(pat, [3, 3], inFilled, 2);
  t(pat, [1, 1], outFilled, 18);
  t(pat, [3, 1], outFilled, 18);
});

test('must flood-fill an empty area', () => {
  const blank = '     \n'.repeat(5);
  t(blank, [3, 3], '*****\n'.repeat(5), 25);
});
