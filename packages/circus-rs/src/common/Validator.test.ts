import { Validator } from './Validator';

describe('Validator', () => {
  test('must process string rule', () => {
    const v = new Validator({
      fruit: ['Fruit', null, 'isLength:1:5|contains:a', null]
    });
    expect(v.validate({ fruit: 'apple' }).result.fruit).toBe('apple');
    expect(v.validate({ fruit: 'banana' }).result).toBe(null);
  });

  test('must process regex rule', () => {
    const v = new Validator({
      fruit: ['Fruit', null, /a/, null]
    });
    expect(v.validate({ fruit: 'apple' }).result.fruit).toBe('apple');
    expect(v.validate({ fruit: 'melon' }).result).toBe(null);
  });

  test('must process callback rule', () => {
    const v = new Validator({
      fruit: [
        'Fruit',
        null,
        function (t) {
          return /a/.test(t);
        },
        null
      ]
    });
    expect(v.validate({ fruit: 'apple' }).result.fruit).toBe('apple');
    expect(v.validate({ fruit: 'melon' }).result).toBe(null);
  });

  test('must pass through input for "null" rule', () => {
    const v = new Validator({ fruit: ['Fruit', null, null, null] });
    expect(v.validate({ fruit: 'apple' }).result.fruit).toBe('apple');
  });

  test('must return default value only if key is not set', () => {
    const v = new Validator({ fruit: ['Fruit', 'orange', () => true, null] });
    expect(v.validate({ fruit: 'apple' }).result.fruit).toBe('apple');
    expect(v.validate({ fruit: '' }).result.fruit).toBe('');
    expect(v.validate({ fruit: null }).result.fruit).toBe(null);
    expect(v.validate({}).result.fruit).toBe('orange');
  });

  test('must sanitize input value', () => {
    const v1 = new Validator({
      fruit: ['Fruit', null, null, 'escape|trim']
    });
    expect(v1.validate({ fruit: ' 2 >= 1\t' }).result.fruit).toBe('2 &gt;= 1');
    const v2 = new Validator({
      fruit: ['Fruit', null, null, (s: string) => s.toUpperCase()]
    });
    expect(v2.validate({ fruit: 'apple' }).result.fruit).toBe('APPLE');
  });

  test('must return null result for invalid input', () => {
    const v = new Validator({
      fruit: ['Fruit', null, 'isLength:1:5', null]
    });
    expect(v.validate({ fruit: 'banana' }).result).toBe(null);
  });
});
