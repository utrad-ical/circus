import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Logger } from '@utrad-ical/circus-lib';
import RawData from '../../common/RawData.ts';
import type { VolumeAccessor } from '../helper/createVolumeProvider.ts';
import createImageTransferAgent from './image-transfer-agent.ts';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const logger = { error: () => {} } as unknown as Logger;

const fakeAccessor = (count: number): VolumeAccessor => ({
  imageMetadata: new Map(),
  volume: new RawData([2, 2, count], 'int16'),
  load: async () => {},
  zIndices: new Map(),
  determinePitch: async () => 1,
  images: [[1, count]],
  isLike3d: async () => true
});

/** Counts the setImmediate calls, which the transfer loop uses */
const countImmediates = async (ms: number) => {
  const original = globalThis.setImmediate;
  let count = 0;
  globalThis.setImmediate = ((fn: any, ...args: any[]) => {
    count++;
    return original(fn, ...args);
  }) as typeof setImmediate;
  try {
    await wait(ms);
  } finally {
    globalThis.setImmediate = original;
  }
  return count;
};

test('stops the loop while all transfers are paused', async () => {
  const sent: number[] = [];
  let release: () => void = () => {};
  const blocked = new Promise<void>(resolve => (release = resolve));
  const agent = createImageTransferAgent({
    imageDataEmitter: async data => {
      sent.push(data.imageIndex);
      await blocked;
    },
    volumeProvider: async () => fakeAccessor(100),
    logger
  });
  const connection = (await agent.beginTransfer('t1', 'uid'))!;
  connection.pause();
  release();
  await wait(10);
  const sentWhilePaused = sent.length;
  assert.ok(sentWhilePaused <= 1);
  assert.equal(await countImmediates(30), 0);

  connection.resume();
  await wait(30);
  assert.ok(sent.length > sentWhilePaused);
  agent.dispose();
});

test('does not start a transfer prepared after dispose', async () => {
  const sent: number[] = [];
  let provide: (accessor: VolumeAccessor) => void = () => {};
  const agent = createImageTransferAgent({
    imageDataEmitter: async data => void sent.push(data.imageIndex),
    volumeProvider: () => new Promise(resolve => (provide = resolve)),
    logger
  });
  const begun = agent.beginTransfer('t1', 'uid');
  await wait(5);
  agent.dispose();
  provide(fakeAccessor(3));
  assert.equal(await begun, null);
  assert.equal(await agent.getConnection('t1'), null);
  await wait(10);
  assert.deepEqual(sent, []);
});

test('forgets a transfer whose series failed to load', async () => {
  const agent = createImageTransferAgent({
    imageDataEmitter: async () => {},
    volumeProvider: async () => {
      throw new Error('Not found');
    },
    logger
  });
  await assert.rejects(agent.beginTransfer('t1', 'uid'), /Not found/);
  assert.equal(await agent.getConnection('t1'), null);
});
