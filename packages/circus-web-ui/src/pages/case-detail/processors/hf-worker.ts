const ctx: DedicatedWorkerGlobalScope = self as any;
import holeFilling2D, {
  holeFilling3D
} from '@utrad-ical/circus-rs/src/common/CCL/holeFilling';

ctx.addEventListener('message', event => {
  const {
    input,
    width,
    height,
    nSlices,
    dimension,
    neighbors,
    orientation,
    bufferSize
  } = event.data;
  const initializedInput = new Uint8Array(width * height * nSlices);
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos0 = i + j * width + k * width * height;
        const pos =
          dimension === 3 || orientation === 'Axial'
            ? i + j * width + k * width * height
            : orientation === 'Coronal'
              ? k + i * nSlices + j * width * nSlices
              : j + k * height + i * height * nSlices;
        initializedInput[pos] = input[pos0];
      }
    }
  }
  let holeFillingResult:
    | {
        result: Uint8Array;
        holeNum: number;
        holeVolume: number;
      }
    | string;
  try {
    holeFillingResult =
      dimension === 3
        ? holeFilling3D(
            initializedInput,
            width,
            height,
            nSlices,
            neighbors,
            bufferSize
          )
        : orientation === 'Axial'
          ? holeFilling2D(
              initializedInput,
              width,
              height,
              nSlices,
              neighbors,
              bufferSize
            )
          : orientation === 'Sagital'
            ? holeFilling2D(
                initializedInput,
                height,
                nSlices,
                width,
                neighbors,
                bufferSize
              )
            : holeFilling2D(
                initializedInput,
                nSlices,
                width,
                height,
                neighbors,
                bufferSize
              );
    const output = new Uint8Array(width * height * nSlices);
    for (let k = 0; k < nSlices; k++) {
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const pos0 = i + j * width + k * width * height;
          const pos =
            dimension === 3 || orientation === 'Axial'
              ? i + j * width + k * width * height
              : orientation === 'Coronal'
                ? k + i * nSlices + j * width * nSlices
                : j + k * height + i * height * nSlices;
          output[pos0] = holeFillingResult.result[pos];
        }
      }
    }
    holeFillingResult.result = output;
  } catch (err: any) {
    console.log(err);
    holeFillingResult = err.message;
  }
  ctx.postMessage(holeFillingResult);
  ctx.close();
});
