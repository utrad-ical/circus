import PriorityIntegerQueue from '../src/common/PriorityIntegerQueue';

const extract = (queue: PriorityIntegerQueue) => {
  const result = [];
  let i;
  while ((i = queue.shift()) !== undefined) {
    result.push(i);
  }
  return result;
};

test('should work with equal priority', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('5-7');
  queue.append('1-3');
  queue.append('10');
  expect(extract(queue)).toEqual([5, 6, 7, 1, 2, 3, 10]);
});

test('should work with some high priority', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('5-7', -1);
  queue.append('1-3', 1);
  queue.append('10');
  queue.append('9', 1);
  expect(extract(queue)).toEqual([1, 2, 3, 9, 10, 5, 6, 7]);
});

test('should overwrite low-priority queue items', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('1-6', 1);
  queue.append('2-4', 3);
  expect(extract(queue)).toEqual([2, 3, 4, 1, 5, 6]);
});

test('should not overwrite high-priority queue items', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('3-5', 3);
  queue.append('1-6', 1);
  expect(extract(queue)).toEqual([3, 4, 5, 1, 2, 6]);
});
