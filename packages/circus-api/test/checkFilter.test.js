import checkFilter from '../src/utils/checkFilter';
import { assert } from 'chai';

describe('checkFilter', function() {
  it('should return true for valid filter', function() {
    const fields = ['age', 'name', 'dept', 'valid', 'birthday'];
    assert.isTrue(checkFilter({ age: 5, name: 'Alice' }, fields));
    assert.isTrue(checkFilter({ age: { $gt: 5 } }, fields));
    assert.isTrue(checkFilter({ age: { $gt: 5, $lt: 7 } }, fields));
    assert.isTrue(checkFilter({ age: 12, $and: [{ name: 'Alice' }] }, fields));
    assert.isTrue(checkFilter({ valid: true }, fields));
    assert.isTrue(checkFilter({ valid: true }, fields));
    assert.isTrue(checkFilter({ birthday: { $date: 'a' } }, fields));
    assert.isTrue(checkFilter({ birthday: { $lt: { $date: 'a' } } }, fields));

    assert.isFalse(checkFilter({ sex: 'F' }, fields));
    assert.isFalse(checkFilter({ age: { $gg: 5 } }, fields));
    assert.isFalse(checkFilter({ name: /Bob/ }, fields));
  });
});
