import floodFill, { BinaryArray2D } from './floodFill';
import { Vector2 } from 'three';

const t = (
  pattern: string,
  start: number[],
  expectedPattern: string,
  expectedFillCount: number,
  erase = false
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
  const filled = floodFill(arr, new Vector2().fromArray(start), erase);
  expect(arr.toString()).toBe(expectedPattern);
  expect(filled).toBe(expectedFillCount);
};

test('must flood-fill a closed area correctly', () => {
  const pat = '*****\n' + '*   *\n'.repeat(3) + '*****';
  t(pat, [3, 3], '*****\n'.repeat(5), 9);
  t(pat, [0, 0], '     \n'.repeat(5), 16, true);
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
  t(pat, [0, 0], '       \n'.repeat(7), 31, true);
  t(pat, [4, 4], '       \n'.repeat(7), 31, true);
  t(pat, [6, 0], '       \n'.repeat(7), 31, true);
  t(pat, [6, 6], '       \n'.repeat(7), 31, true);
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
  const outErased =
    '        \n' +
    '        \n' +
    '  ****  \n' +
    '  *  *  \n' +
    '  ****  \n' +
    '        \n' +
    '        \n';
  const inErased =
    '********\n' +
    '*      *\n' +
    '*      *\n' +
    '*      *\n' +
    '*      *\n' +
    '*      *\n' +
    '********\n';

  t(pat, [3, 3], inFilled, 2);
  t(pat, [1, 1], outFilled, 18);
  t(pat, [3, 1], outFilled, 18);
  t(pat, [2, 2], inErased, 10, true);
  t(pat, [0, 0], outErased, 26, true);
  t(pat, [0, 4], outErased, 26, true);
});

test('must flood-fill an empty area', () => {
  const blank = '     \n'.repeat(5);
  t(blank, [3, 3], '*****\n'.repeat(5), 25);
  t(blank, [3, 3], '     \n'.repeat(5), 0, true);
});

test('must erase a filled area', () => {
  const filled = '*****\n'.repeat(5);
  t(filled, [3, 3], '     \n'.repeat(5), 25, true);
});

const t_err = (
  pattern: string,
  start: number[],
  expectedErrorMessage: string,
  erase = false
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
  expect(() => floodFill(arr, new Vector2().fromArray(start), erase)).toThrow(
    expectedErrorMessage
  );
};

test('must throw error message if center value is invalid', () => {
  const pat = '*****\n' + '*   *\n'.repeat(3) + '*****';
  t_err(pat, [50, 50], 'value of center is not contained in the grid');
});
