import CCL from './ConnectedComponentLabeling2D4';
import { mosaic, white, black, sampleImg } from './TestUtl_CCLsampleImg';

function CCLTest(
  array: Uint8Array,
  width: number,
  height: number,
  answer: Uint8Array | Uint16Array,
  labelNo: number,
  volume: Uint32Array,
  UL: Uint16Array,
  LR: Uint16Array
) {
  return () => {
    const labelingResults = CCL(array, width, height);
    let flag = labelingResults.labelnum !== labelNo ? true : false;
    if (flag === false) {
      for (let i = 0; i < width * height; i++) {
        if (labelingResults.labelMap[i] !== answer[i]) {
          flag = true;
          break;
        }
      }

      for (let i = 0; i <= labelingResults.labelnum; i++) {
        if (i === 0 && volume[i] === 0) {
          continue;
        }
        const pos = [i * 3, i * 3 + 1];
        if (
          volume[i] !== labelingResults.labels[i].volume ||
          UL[pos[0]] !== labelingResults.labels[i].min[0] ||
          LR[pos[0]] !== labelingResults.labels[i].max[0] ||
          UL[pos[1]] !== labelingResults.labels[i].min[1] ||
          LR[pos[1]] !== labelingResults.labels[i].max[1]
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
  const neighbor = 6;
  const [img, label, num, volume, UL, LR] = mosaic(width, width, 1, neighbor);
  expect(() => CCL(img, width, width)).toThrow(
    `number of tentative label is not in 8 bit.`
  );
});

describe('labeling: Mosaic', () => {
  const width = 16;
  const neighbor = 6;
  const [img, label, num, volume, UL, LR] = mosaic(width, width, 1, neighbor);
  test('2D 4-neighbor', CCLTest(img, width, width, label, num, volume, UL, LR));
});

describe('labeling: black', () => {
  const width = 16;
  const volume = new Uint32Array([width ** 2]);
  const UL = new Uint16Array([0, 0, 0]);
  const LR = new Uint16Array([width - 1, width - 1, 0]);
  test(
    '2D 4-neighbor',
    CCLTest(
      black(width, width, 1),
      width,
      width,
      black(width, width, 1),
      0,
      volume,
      UL,
      LR
    )
  );
});

describe('labeling: white', () => {
  const width = 16;
  const volume = new Uint32Array([0, width ** 2]);
  const UL = new Uint16Array([width, width, 0, 0, 0, 0]);
  const LR = new Uint16Array([0, 0, 0, width - 1, width - 1, 0]);
  test(
    '2D white 4-neighbor',
    CCLTest(
      white(width, width, 1),
      width,
      width,
      white(width, width, 1),
      1,
      volume,
      UL,
      LR
    )
  );
});

describe('labeling: sampleImg', () => {
  let width, height, str;
  [width, height] = [16, 16];
  str = `2D sampleImg 4-neighbor`;
  const [img, label, num, volume, UL, LR] = sampleImg(4);
  test(str, CCLTest(img, width, height, label, num, volume, UL, LR));
});
