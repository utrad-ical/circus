import bucketErase, { BinaryArray2D } from './bucketErase';
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
  const erased = bucketErase(arr, new Vector2().fromArray(start));
  expect(arr.toString()).toBe(expectedPattern);
  expect(erased).toBe(expectedFillCount);
};

test('must erase a 4-connected area correctly', () => {
  const pat = '     \n' + ' *** \n'.repeat(3) + '     ';
  t(pat, [3, 3], '     \n'.repeat(5), 9);
});

test('must erase a 4-connected area correctly', () => {
  const pat =
    '*******\n' +
    '*     *\n' +
    '* *** *\n' +
    '* * * *\n' +
    '* * * *\n' +
    '* *   *\n' +
    '* *****';
  t(pat, [4, 4], '       \n'.repeat(7), 31);
  t(pat, [0, 0], '       \n'.repeat(7), 31);
  t(pat, [6, 0], '       \n'.repeat(7), 31);
  t(pat, [6, 6], '       \n'.repeat(7), 31);
});

test('must erase a ring-like 4-connected area correctly', () => {
  const pat =
    '********\n' +
    '*      *\n' +
    '* **** *\n' +
    '* *  * *\n' +
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

  t(pat, [2, 2], inErased, 10);
  t(pat, [0, 0], outErased, 26);
  t(pat, [0, 4], outErased, 26);
});

test('must erase a filled area', () => {
  const filled = '*****\n'.repeat(5);
  t(filled, [3, 3], '     \n'.repeat(5), 25);
});

test('must return same image', () => {
  const filled = '*    \n'.repeat(5);
  t(filled, [3, 3], '*    \n'.repeat(5), 0);
});
