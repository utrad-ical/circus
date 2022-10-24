import PriorityIntegerQueue from './PriorityIntegerQueue';

const extract = (queue: PriorityIntegerQueue) => {
  const result: number[] = [];
  let i: number | undefined;
  while ((i = queue.shift()) !== undefined) {
    result.push(i);
  }
  return result;
};

test('equal priority', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('5-7');
  queue.append('1-3');
  queue.append('10');
  expect(extract(queue)).toEqual([5, 6, 7, 1, 2, 3, 10]);
});

test('equal priority, LIFO', () => {
  const queue = new PriorityIntegerQueue({ lifoForSamePriority: true });
  queue.append('5-7');
  queue.append('1-3');
  queue.append('2,6,10');
  expect(extract(queue)).toEqual([2, 6, 10, 1, 3, 5, 7]);
});

test('high-priority items precede', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('5-7', -1);
  queue.append('1-3', 1);
  queue.append('10');
  queue.append('9', 1);
  expect(extract(queue)).toEqual([1, 2, 3, 9, 10, 5, 6, 7]);
});

test('high-priority items precede, LIFO', () => {
  const queue = new PriorityIntegerQueue({ lifoForSamePriority: true });
  queue.append('1-10', 1);
  queue.append('8', 5);
  queue.append('6', 5);
  queue.append('7', 5);
  queue.append('9', 5);
  queue.append('2-3', 8);
  queue.append('50', 8);
  expect(extract(queue)).toEqual([50, 2, 3, 9, 7, 6, 8, 1, 4, 5, 10]);
});

test('overwrite low-priority queue items', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('1-6', 1);
  queue.append('2-4', 3);
  expect(extract(queue)).toEqual([2, 3, 4, 1, 5, 6]);
});

test('do not overwrite high-priority queue items', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('3-5', 3);
  queue.append('1-6', 1);
  queue.append('4', 0);
  expect(extract(queue)).toEqual([3, 4, 5, 1, 2, 6]);
});

test('clear', () => {
  const queue = new PriorityIntegerQueue();
  queue.append('1-10');
  queue.clear();
  queue.append('30');
  expect(extract(queue)).toEqual([30]);
});
