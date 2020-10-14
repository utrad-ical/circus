import CCL from './ConnectedComponentLabeling2D4';
import { mosaic, white, black, sampleImg } from './CCL_sampleImg';

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
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const pos = i + width * j;
          if (labelingResults.labelMap[pos] !== answer[pos]) {
            flag = true;
            break;
          }
        }
      }

      for (let i = 0; i <= labelingResults.labelnum; i++) {
        if (i === 0 && volume[i] === 0) {
          continue;
        }
        if (
          volume[i] !== labelingResults.labels[i].volume ||
          UL[i * 3] !== labelingResults.labels[i].min[0] ||
          LR[i * 3] !== labelingResults.labels[i].max[0] ||
          UL[i * 3 + 1] !== labelingResults.labels[i].min[1] ||
          LR[i * 3 + 1] !== labelingResults.labels[i].max[1]
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
  const width = 22;
  const neighbor = 6;
  const [img, label, num, volume, UL, LR] = mosaic(width, width, 1, neighbor);
  test('2D 4-neighbor', CCLTest(img, width, width, label, num, volume, UL, LR));
});

describe('labeling: black', () => {
  const width = 1024;
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
  const width = 1024;
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
  str = `2D`;
  str = `${str} sampleImg 8-neighbor`;
  const [img, label, num, volume, UL, LR] = sampleImg(4);
  test(str, CCLTest(img, width, height, label, num, volume, UL, LR));
});
