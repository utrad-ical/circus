'use strict';

const assert = require('chai').assert;
const AsyncPriorityCaller = require('../src/common/PriorityIntegerCaller')
  .default;
const range = require('multi-integer-range').multirange;

describe('AsyncPriorityCaller', function() {
  const sleep = () => new Promise((ok, ng) => setTimeout(ok, 10));

  it('must support priority according to PriorityIntegerQueue algorithm.', async () => {
    const result = [];
    const callback = async index => {
      await sleep();
      result.push(index);
    };
    const loader = new AsyncPriorityCaller(callback);
    loader.append('1', 10);
    loader.append('2', 20);
    loader.append('3', 30);
    await loader.waitFor('3');
    assert.deepEqual(result, [1, 3]);
    await loader.waitFor('1-3');
    assert.deepEqual(result, [1, 3, 2]);

    loader.append('4', 40);
    loader.append('5', 50);
    loader.append('6', 60);
    loader.append('7', 70);

    loader.append('5', 500); // update priority to higher
    loader.append('7', 7); // update priority to lower (rejected)

    await loader.waitFor('1-7');
    assert.deepEqual(result, [1, 3, 2].concat([4, 5, 7, 6]));
  });

  it('must invoke the function only once for each integer.', async () => {
    const result = [];
    const callback = async index => {
      await sleep();
      result.push(index);
    };
    const loader = new AsyncPriorityCaller(callback);

    loader.append('1');
    loader.append('2');
    loader.append('1');
    loader.append('2');
    await loader.waitFor('2');
    assert.deepEqual(result, [1, 2]);
  });

  it('must handle reject.', async () => {
    const result = [];
    const callback = async index => {
      await sleep();
      if (index % 7 === 0) throw Error('Rejected multiples of 7');
      result.push(index);
    };
    const loader = new AsyncPriorityCaller(callback);

    loader.append('1-10');

    await loader.waitFor('1-6');
    assert(range(result).has('1-6'));

    try {
      await loader.waitFor('8');
    } catch (e) {
      throw new Error('Reject is not implemented validly.');
    }

    try {
      await loader.waitFor('7');
      throw new Error('Reject is not implemented validly.');
    } catch (e) {}

    try {
      await loader.waitFor('9-10');
    } catch (e) {
      throw new Error('Reject is not implemented validly.');
    }
  });

  it('must accept initial resolved range.', async () => {
    const result = [];
    const callback = async index => {
      await sleep();
      if (index % 7 === 0) throw Error('Rejected multiples of 7');
      result.push(index);
    };
    const loader = new AsyncPriorityCaller(callback, { resolved: '5-8' });

    loader.append('1-10');
    try {
      await loader.waitFor('1-10');
    } catch (e) {
      throw new Error('implemented invalidly.');
    }
    assert(!range(result).has('5-8'));
    assert(range(result).has('1-4, 9-10'));
  });
});
