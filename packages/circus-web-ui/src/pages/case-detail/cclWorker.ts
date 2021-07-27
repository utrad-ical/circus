const ctx: Worker = self as any;
import CCL26 from '@utrad-ical/circus-rs/src/common/CCL/ConnectedComponentLabeling3D26';
import CCL6 from '@utrad-ical/circus-rs/src/common/CCL/ConnectedComponentLabeling3D6';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';

ctx.addEventListener('message', event => {
  const { input, width, height, nSlices, neighbors } = event.data;
  let labelingResults: LabelingResults3D | string;
  try {
    labelingResults =
      neighbors === 6
        ? CCL6(input, width, height, nSlices)
        : CCL26(input, width, height, nSlices);
  } catch (err) {
    labelingResults = err;
  }
  ctx.postMessage(labelingResults);
});
