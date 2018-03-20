'use strict';

const assert = require('chai').assert;
const {
  default: floodFill,
  BinaryArray2D
} = require('../src/browser/util/floodFill');
const { Vector2 } = require('three');

describe('floodFill', function() {
  function t(pattern, start, expectedPattern, expectedFillCount) {
    const rows = pattern.replace(/\n$/, '').split(/\n/);
    const width = Math.max.apply(Math, rows.map(r => r.length));
    const arr = new BinaryArray2D(width, rows.length);
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < width; x++) {
        if (rows[y][x] === '*') arr.set(true, new Vector2(x, y));
      }
    }
    const filled = floodFill(arr, new Vector2().fromArray(start));
    assert.equal(arr.toString(), expectedPattern);
    assert.equal(filled, expectedFillCount);
  }

  it('must flood-fill a closed area correctly', function() {
    const pat = '*****\n' + '*   *\n'.repeat(3) + '*****';
    t(pat, [3, 3], '*****\n'.repeat(5), 9);
  });

  it('must flood-fill a complexed cloed area', function() {
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

  it('must flood-fill a ring-like closed area', function() {
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

  it('must flood-fill an empty area', function() {
    const blank = '     \n'.repeat(5);
    t(blank, [3, 3], '*****\n'.repeat(5), 25);
  });
});
