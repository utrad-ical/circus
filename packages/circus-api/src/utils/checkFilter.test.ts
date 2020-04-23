import checkFilter from './checkFilter';
import { EJSON } from 'bson';

const fields = ['age', 'name', 'dept', 'valid', 'birthday'];

describe('checkFilter', () => {
  test('normal scalar types', () => {
    expect(checkFilter({ age: 5, name: 'Alice' }, fields)).toBe(true);
    expect(checkFilter({ age: { $gt: 5 } }, fields)).toBe(true);
    expect(checkFilter({ age: { $gt: 5, $lt: 7 } }, fields)).toBe(true);
    expect(checkFilter({ age: 12, $and: [{ name: 'Alice' }] }, fields)).toBe(
      true
    );
    expect(checkFilter({ valid: true }, fields)).toBe(true);
    expect(checkFilter({ name: { $in: ['Alice', 'Bob'] } }, fields)).toBe(true);
    expect(checkFilter({ sex: 'F' }, fields)).toBe(false);
    expect(checkFilter({ age: { $gg: 5 } }, fields)).toBe(false);
    expect(checkFilter({ name: /Bob/ }, fields)).toBe(false);
  });

  test('dates and regexp', () => {
    expect(checkFilter({ birthday: new Date() }, fields)).toBe(true);
    expect(
      checkFilter(
        EJSON.parse('{"birthday":{"$lt":{"$date":"2015-11-11T00:22:33Z"}}}'),
        fields
      )
    ).toBe(true);
    expect(checkFilter(EJSON.parse('{"name":{"$regex":"^An"}}'), fields)).toBe(
      true
    );
  });
});
