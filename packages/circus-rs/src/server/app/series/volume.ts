import type { Handler } from 'hono';
import type { RsEnv } from '../../types.ts';
import createPartialVolume from './createPartialVolume.ts';

const PARTIAL_VOLUME_PRIORITY = 1;

export const volume: Handler<RsEnv> = async ctx => {
  const { volumeAccessor, partialVolumeDescriptor } = ctx.var;
  const { images, volume, load } = volumeAccessor;

  let data: ArrayBuffer;
  if (partialVolumeDescriptor) {
    const partialVolume = await createPartialVolume(
      volumeAccessor,
      partialVolumeDescriptor,
      PARTIAL_VOLUME_PRIORITY
    );
    data = partialVolume.data;
  } else {
    await load(images);
    data = volume.data;
  }
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Keep a view of the volume instead of copying it into the response.
      controller.enqueue(new Uint8Array(data));
      controller.close();
    }
  });
  return ctx.body(body, 200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(data.byteLength)
  });
};
