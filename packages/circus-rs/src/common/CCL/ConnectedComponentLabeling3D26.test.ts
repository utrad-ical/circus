import CCL from './ConnectedComponentLabeling3D26';
import { mosaic, white, black, sampleImg } from './TestUtl_CCLsampleImg';

function CCLTest(
  array: Uint8Array,
  width: number,
  height: number,
  NSlice: number,
  answer: Uint8Array | Uint16Array,
  labelNo: number,
  volume: Uint32Array,
  UL: Uint16Array,
  LR: Uint16Array
) {
  return () => {
    const labelingResults = CCL(array, width, height, NSlice);
    let flag = labelingResults.labelnum !== labelNo ? true : false;
    if (flag === false) {
      for (let i = 0; i < width * height * NSlice; i++) {
        if (labelingResults.labelMap[i] !== answer[i]) {
          flag = true;
          break;
        }
      }
      for (let i = 0; i <= labelingResults.labelnum; i++) {
        if (i === 0 && volume[i] === 0) {
          continue;
        }
        const pos = [i * 3, i * 3 + 1, i * 3 + 2];
        if (
          volume[i] != labelingResults.labels[i].volume ||
          UL[pos[0]] != labelingResults.labels[i].min[0] ||
          LR[pos[0]] != labelingResults.labels[i].max[0] ||
          UL[pos[1]] != labelingResults.labels[i].min[1] ||
          LR[pos[1]] != labelingResults.labels[i].max[1] ||
          UL[pos[2]] != labelingResults.labels[i].min[2] ||
          LR[pos[2]] != labelingResults.labels[i].max[2]
        ) {
          flag = true;
          break;
        }
      }
    }
    expect(flag).toBe(false);
  };
}

test('<Exception handling> number of tentative label > 8 bit', () => {
  const width = 512;
  const neighbor = 26;
  const [img, label, num, volume, UL, LR] = mosaic(
    width,
    width,
    width,
    neighbor
  );
  expect(() => CCL(img, width, width, width)).toThrow(
    `number of tentative label is not in 8 bit.`
  );
});

describe('labeling: Mosaic', () => {
  const width = 40;
  const neighbor = 26;
  const [img, label, num, volume, UL, LR] = mosaic(
    width,
    width,
    width,
    neighbor
  );
  test(
    '3D 26-neighbor',
    CCLTest(img, width, width, width, label, num, volume, UL, LR)
  );
});

describe('labeling: black', () => {
  const width = 512;
  const volume = new Uint32Array([width ** 3]);
  const UL = new Uint16Array([0, 0, 0]);
  const LR = new Uint16Array([width - 1, width - 1, width - 1]);
  test(
    '3D 26-neighbor',
    CCLTest(
      black(width, width, width),
      width,
      width,
      width,
      black(width, width, width),
      0,
      volume,
      UL,
      LR
    )
  );
});

describe('labeling: white', () => {
  const width = 512;
  const volume = new Uint32Array([0, width ** 3]);
  const UL = new Uint16Array([width, width, width, 0, 0, 0]);
  const LR = new Uint16Array([0, 0, 0, width - 1, width - 1, width - 1]);
  test(
    '3D white 26-neighbor',
    CCLTest(
      white(width, width, width),
      width,
      width,
      width,
      white(width, width, width),
      1,
      volume,
      UL,
      LR
    )
  );
});

describe('labeling: sampleImg', () => {
  const [width, height, NSlice] = [10, 10, 3];
  const str = `3D sampleImg 26-neighbor`;
  const [img, label, num, volume, UL, LR] = sampleImg(26);
  test(str, CCLTest(img, width, height, NSlice, label, num, volume, UL, LR));
});

describe('3D labeling: 1 slice', () => {
  const [width, height, NSlice] = [16, 16, 1];
  let [img, label, num, volume, UL, LR] = sampleImg(8);
  test(
    `3D sampleImg 26-neighbor`,
    CCLTest(img, width, height, NSlice, label, num, volume, UL, LR)
  );
});
