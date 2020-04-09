const createCounter = require('../src/server/helper/Counter').default;
const assert = require('chai').assert;

describe('Counter', function() {
  it('must count up', async function() {
    const counter = await createCounter();
    assert.strictEqual(counter.getCount('foo'), 0);
    assert.strictEqual(counter.getCount('bar'), 0);
    counter.countUp('foo');
    assert.strictEqual(counter.getCount('foo'), 1);
    assert.strictEqual(counter.getCount('bar'), 0);
  });

  it('must return set of counters', async function() {
    const counter = await createCounter();
    counter.countUp('foo');
    counter.countUp('bar');
    counter.countUp('bar');
    assert.deepEqual(counter.getCounts(), { foo: 1, bar: 2 });
  });
});
