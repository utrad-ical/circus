import extractCommonValues from './extractCommonValues';

describe('extractCommonValues', () => {
  test('simple scalar', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 7, c: 8 },
      { a: 1, b: 8, c: 8 }
    ];
    const output = {
      common: { a: 1, c: 8 },
      unique: [{ b: 5 }, { b: 7 }, { b: 8 }]
    };
    expect(extractCommonValues(input)).toEqual(output);
  });

  test('all common values', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 5, c: 8 }
    ];
    const output = {
      common: { a: 1, b: 5, c: 8 },
      unique: [{}, {}, {}]
    };
    expect(extractCommonValues(input)).toEqual(output);
  });

  test('preserve input', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 2, b: 5, c: 8 },
      { a: 3, b: 5, c: 8 }
    ];
    const output = {
      common: { b: 5, c: 8 },
      unique: [{ a: 1 }, { a: 2 }, { a: 3 }]
    };
    expect(extractCommonValues(input)).toEqual(output);
    expect(input).toEqual([
      { a: 1, b: 5, c: 8 },
      { a: 2, b: 5, c: 8 },
      { a: 3, b: 5, c: 8 }
    ]);
  });

  test('all unique values', () => {
    const input = [
      { a: 1, b: 5, c: 8 },
      { a: 1, b: 1, c: 4 },
      { a: 2, b: 1, c: 8 }
    ];
    const output = {
      common: {},
      unique: [
        { a: 1, b: 5, c: 8 },
        { a: 1, b: 1, c: 4 },
        { a: 2, b: 1, c: 8 }
      ]
    };
    expect(extractCommonValues(input)).toEqual(output);
  });

  test('no input', () => {
    const input: object[] = [];
    const output = { common: {}, unique: [{}] };
    expect(extractCommonValues(input)).toEqual(output);
  });

  test('has nested values', () => {
    const input = [
      { a: 1, b: 5, c: ['z', 'y'], d: { x: 1 }, e: { w: 'w' } },
      { a: 1, b: 7, c: ['z', 'y'], d: { x: 1 }, e: { w: '' } }
    ];
    const output = {
      common: { a: 1, c: ['z', 'y'], d: { x: 1 } },
      unique: [
        { b: 5, e: { w: 'w' } },
        { b: 7, e: { w: '' } }
      ]
    };
    expect(extractCommonValues(input)).toEqual(output);
  });
});
