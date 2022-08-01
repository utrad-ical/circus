const ctx: DedicatedWorkerGlobalScope = self as any;
import intersliceInterpolation from '@utrad-ical/circus-rs/src/common/morphology/intersliceInterpolation';

ctx.addEventListener('message', event => {
  const { input, width, height, nSlices, mode } = event.data;

  let result: Uint8Array;
  try {
    result = intersliceInterpolation(input, width, height, nSlices, mode);
  } catch (err: any) {
    console.log(err);
    result = err.message;
  }
  ctx.postMessage(result);
  ctx.close();
});
