const Counter = require('../src/server/Counter').default;
const assert = require('chai').assert;

describe('Counter', function() {
  it('must count up', function() {
    const counter = new Counter();
    assert.strictEqual(counter.getCount('foo'), 0);
    assert.strictEqual(counter.getCount('bar'), 0);
    counter.countUp('foo');
    assert.strictEqual(counter.getCount('foo'), 1);
    assert.strictEqual(counter.getCount('bar'), 0);
  });

  it('must return set of counters', function() {
    const counter = new Counter();
    counter.countUp('foo');
    counter.countUp('bar');
    counter.countUp('bar');
    assert.deepEqual(counter.getCounts(), { foo: 1, bar: 2 });
  });
});
