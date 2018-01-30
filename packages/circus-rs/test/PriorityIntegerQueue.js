var assert = require('chai').assert;
var PriorityIntegerQueue = require('../src/common/PriorityIntegerQueue')
  .default;

describe('PriorityIntegerQueue', function() {
  function extract(queue) {
    var result = [];
    var i;
    while ((i = queue.pop()) !== undefined) {
      result.push(i);
    }
    return result;
  }

  it('should work with equal priority', function() {
    const queue = new PriorityIntegerQueue();
    queue.append('5-7');
    queue.append('1-3');
    queue.append('10');
    assert.deepEqual(extract(queue), [5, 6, 7, 1, 2, 3, 10]);
  });

  it('should work with some high priority', function() {
    const queue = new PriorityIntegerQueue();
    queue.append('5-7', -1);
    queue.append('1-3', 1);
    queue.append('10');
    queue.append('9', 1);
    assert.deepEqual(extract(queue), [1, 2, 3, 9, 10, 5, 6, 7]);
  });

  it('should overwrite low-priority queue items', function() {
    const queue = new PriorityIntegerQueue();
    queue.append('1-6', 1);
    queue.append('2-4', 3);
    assert.deepEqual(extract(queue), [2, 3, 4, 1, 5, 6]);
  });

  it('should not overwrite high-priority queue items', function() {
    const queue = new PriorityIntegerQueue();
    queue.append('3-5', 3);
    queue.append('1-6', 1);
    assert.deepEqual(extract(queue), [3, 4, 5, 1, 2, 6]);
  });
});
