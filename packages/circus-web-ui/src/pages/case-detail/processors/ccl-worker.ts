const ctx: DedicatedWorkerGlobalScope = self as any;
import type { LabelingResults3D } from '@utrad-ical/circus-rs';
import { CCL3D26 as CCL26, CCL3D6 as CCL6 } from '@utrad-ical/circus-rs';

ctx.addEventListener('message', event => {
  const { input, width, height, nSlices, neighbors, bufferSize } = event.data;
  let labelingResults: LabelingResults3D | string;
  try {
    labelingResults =
      neighbors === 6
        ? CCL6(input, width, height, nSlices, bufferSize)
        : CCL26(input, width, height, nSlices, bufferSize);
  } catch (err: any) {
    console.log(err);
    labelingResults = err.message;
  }
  ctx.postMessage(labelingResults);
  ctx.close();
});
