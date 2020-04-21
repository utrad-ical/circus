import AsyncPriorityCaller from './PriorityIntegerCaller';
import { multirange } from 'multi-integer-range';

const sleep = () => new Promise(resolve => setTimeout(resolve, 10));

test('must support priority according to PriorityIntegerQueue algorithm', async () => {
  const result: number[] = [];
  const callback = async (index: number) => {
    await sleep();
    result.push(index);
  };
  const loader = new AsyncPriorityCaller(callback);
  loader.append('1', 10);
  loader.append('2', 20);
  loader.append('3', 30);
  await loader.waitFor('3');
  expect(result).toEqual([1, 3]);
  await loader.waitFor('1-3');
  expect(result).toEqual([1, 3, 2]);

  loader.append('4', 40);
  loader.append('5', 50);
  loader.append('6', 60);
  loader.append('7', 70);

  loader.append('5', 500); // update priority to higher
  loader.append('7', 7); // update priority to lower (rejected)

  await loader.waitFor('1-7');
  expect(result).toEqual([1, 3, 2].concat([4, 5, 7, 6]));
});

test('must invoke the callback only once for each integer', async () => {
  const result: number[] = [];
  const callback = async (index: number) => {
    await sleep();
    result.push(index);
  };
  const loader = new AsyncPriorityCaller(callback);

  loader.append('1');
  loader.append('2');
  loader.append('1');
  loader.append('2');
  await loader.waitFor('2');
  expect(result).toEqual([1, 2]);
});

test('must handle rejection', async () => {
  const result: number[] = [];
  const callback = async (index: number) => {
    await sleep();
    if (index % 7 === 0) throw new Error('Rejected multiples of 7');
    result.push(index);
  };
  const loader = new AsyncPriorityCaller(callback);
  loader.append('1-10');
  await loader.waitFor('1-6');
  expect(multirange(result).has('1-6')).toBe(true);
  await loader.waitFor('8'); // must not throw
  await expect(loader.waitFor(7)).rejects.toThrow('Rejected with 7');
  await loader.waitFor('9-10'); // must not throw
});

test('must accept initial resolved range', async () => {
  const result: number[] = [];
  const callback = async (index: number) => {
    await sleep();
    if (index % 7 === 0) throw new Error('Rejected multiples of 7');
    result.push(index);
  };
  const loader = new AsyncPriorityCaller(callback, { resolved: '5-8' });

  loader.append('1-10');
  await loader.waitFor('1-10'); // must not throw
  expect(multirange(result).has('5-8')).toBe(false);
  expect(multirange(result).has('1-4, 9-10')).toBe(true);
});
