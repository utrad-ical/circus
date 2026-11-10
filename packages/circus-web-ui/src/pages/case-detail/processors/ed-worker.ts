const ctx: DedicatedWorkerGlobalScope = self as any;
import { dilation, erosion } from '@utrad-ical/circus-rs';

ctx.addEventListener('message', event => {
  const { input, width, height, nSlices, structure, isErosion } = event.data;

  let result: Uint8Array;
  try {
    result = isErosion
      ? erosion(input, width, height, nSlices, structure)
      : dilation(input, width, height, nSlices, structure);
  } catch (err: any) {
    console.log(err);
    result = err.message;
  }
  ctx.postMessage(result);
  ctx.close();
});
