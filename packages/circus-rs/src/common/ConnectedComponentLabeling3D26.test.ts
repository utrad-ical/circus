import CCL from './ConnectedComponentLabeling3D26';
import labeling from './Labeling3D_6';

function mosaic(
  width: number,
  height: number,
  NSlice: number,
  neightbor: 6 | 26
): [Uint8Array, Uint16Array, number, Uint32Array, Uint16Array, Uint16Array] {
  const img = new Uint8Array(width * height * NSlice);
  const label = new Uint16Array(width * height * NSlice);
  const num = neightbor === 6 ? Math.floor((width * height * NSlice) / 2) : 1;
  const volume = new Uint32Array(num + 1);
  const UL = new Uint16Array((num + 1) * 3).map(() =>
    width < height
      ? height < NSlice
        ? NSlice
        : height
      : width < NSlice
      ? NSlice
      : width
  );
  const LR = new Uint16Array(
    (Math.floor((width * height * NSlice) / 2) + 1) * 3
  );

  let sum = 0;
  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos = i + width * (j + k * height);
        if ((i % 2) + (j % 2) === 1) {
          img[pos] = 1 - (k % 2);
        } else {
          img[pos] = k % 2;
        }
        label[pos] = img[pos] === 1 ? ++sum : 0;
        if (num === 1) {
          volume[img[pos]]++;
          if (i < UL[img[pos] * 3]) {
            UL[img[pos] * 3] = i;
          }
          if (LR[img[pos] * 3] < i) {
            LR[img[pos] * 3] = i;
          }
          if (j < UL[img[pos] * 3 + 1]) {
            UL[img[pos] * 3 + 1] = j;
          }
          if (LR[img[pos] * 3 + 1] < j) {
            LR[img[pos] * 3 + 1] = j;
          }
          if (k < UL[img[pos] * 3 + 2]) {
            UL[img[pos] * 3 + 2] = k;
          }
          if (LR[img[pos] * 3 + 2] < k) {
            LR[img[pos] * 3 + 2] = k;
          }
        } else {
          volume[label[pos]]++;
          if (i < UL[label[pos] * 3]) {
            UL[label[pos] * 3] = i;
          }
          if (LR[label[pos] * 3] < i) {
            LR[label[pos] * 3] = i;
          }
          if (j < UL[label[pos] * 3 + 1]) {
            UL[label[pos] * 3 + 1] = j;
          }
          if (LR[label[pos] * 3 + 1] < j) {
            LR[label[pos] * 3 + 1] = j;
          }
          if (k < UL[label[pos] * 3 + 2]) {
            UL[label[pos] * 3 + 2] = k;
          }
          if (LR[label[pos] * 3 + 2] < k) {
            LR[label[pos] * 3 + 2] = k;
          }
        }
      }
    }
  }
  return [img, label, sum, volume, UL, LR];
}

function white(width: number, height: number, NSlice: number) {
  const img = new Uint8Array(width * height * NSlice).map(_ => {
    return 1;
  });
  return img;
}

function black(width: number, height: number, NSlice: number) {
  const img = new Uint8Array(width * height * NSlice).map(_ => {
    return 0;
  });
  return img;
}

function sampleImg(
  neighbor: number
): [Uint8Array, Uint8Array, number, Uint32Array, Uint16Array, Uint16Array] {
  const [width, height, NSlice] = [16, 16, 16];
  if (neighbor === 6 || neighbor === 26) {
    // prettier-ignore
    const img =  new Uint8Array([
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 1, 1, 0, 0,
      0, 0, 1, 1, 0, 0, 1, 0, 1, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 1, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 1
    ]);
    if (neighbor === 6) {
      // prettier-ignore
      const label = new Uint8Array([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2, 0, 0, 0, 3, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 0, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 2, 0, 0, 3, 3, 0, 0,
        0, 0, 2, 2, 0, 0, 3, 0, 4, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 5,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 5,
        0, 0, 0, 0, 0, 0, 3, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 6
      ]);
      const volume = new Uint32Array([260, 1, 14, 21, 1, 2, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 0, 0, 0, 1, 1, 0, 6, 3, 0, 8, 4, 1, 9, 5, 1, 9, 9, 2]);
      // prettier-ignore
      const LR = new Uint16Array([9, 9, 2, 0, 0, 0, 3, 4, 1, 8, 7, 2, 8, 4, 1, 9, 6, 1, 9, 9, 2]);
      return [img, label, 6, volume, UL, LR];
    } else {
      // prettier-ignore
      const label = new Uint8Array([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 0, 0, 0, 2, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 0, 0, 2, 2, 0, 0,
        0, 0, 1, 1, 0, 0, 2, 0, 2, 0,
        0, 0, 0, 0, 0, 0, 2, 0, 0, 2,
        0, 0, 0, 0, 0, 0, 2, 0, 0, 2,
        0, 0, 0, 0, 0, 0, 2, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 3
      ]);
      const volume = new Uint32Array([260, 15, 24, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 0, 0, 0, 6, 3, 0, 9, 9, 2]);
      // prettier-ignore
      const LR = new Uint16Array([9, 9, 2, 3, 4, 1, 9, 7, 2, 9, 9, 2]);
      return [img, label, 3, volume, UL, LR];
    }
  } else {
    // prettier-ignore
    const img =  new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
    if (neighbor === 4) {
      // prettier-ignore
      const label =  new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 4, 0, 0, 5, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
      const volume = new Uint32Array([236, 1, 6, 2, 3, 1, 2, 4, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 15, 0, 0, 1, 3, 0, 7, 7, 0, 6, 8, 0, 9, 8, 0, 10, 9, 0, 7, 11, 0, 0, 15, 0]);
      // prettier-ignore
      const LR = new Uint16Array([15, 15, 0, 15, 0, 0, 3, 5, 0, 8, 7, 0, 6, 10, 0, 9, 8, 0, 10, 10, 0, 9, 12, 0, 0, 15, 0]);

      return [img, label, 8, volume, UL, LR];
    } else {
      // prettier-ignore
      const label =  new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]);
      const volume = new Uint32Array([236, 1, 6, 12, 1]);
      // prettier-ignore
      const UL = new Uint16Array([0, 0, 0, 15, 0, 0, 1, 3, 0, 6, 7, 0, 0, 15, 0]);
      // prettier-ignore
      const LR = new Uint16Array([15, 15, 0, 15, 0, 0, 3, 5, 0, 10, 12, 0, 0, 15, 0]);
      return [img, label, 4, volume, UL, LR];
    }
  }
}

const CCLTest = (
  array: Uint8Array,
  width: number,
  height: number,
  NSlice: number,
  answer: Uint8Array | Uint16Array,
  labelNo: number,
  volume: Uint32Array,
  UL: Uint16Array,
  LR: Uint16Array
) => {
  return () => {
    const [labeledImg, no, _volume, _UL, _LR] = CCL(
      array,
      width,
      height,
      NSlice
    );
    let flag = no !== labelNo ? true : false;
    if (flag === false) {
      for (let k = 0; k < NSlice; k++) {
        for (let j = 0; j < height; j++) {
          for (let i = 0; i < width; i++) {
            const pos = i + width * (j + k * height);
            if (labeledImg[pos] !== answer[pos]) {
              flag = true;
              break;
            }
          }
        }
      }
      for (let i = 0; i <= no; i++) {
        if (i === 0 && volume[i] === 0) {
          continue;
        }
        if (
          volume[i] != _volume[i] ||
          UL[i * 3] != _UL[i * 3] ||
          LR[i * 3] != _LR[i * 3] ||
          UL[i * 3 + 1] != _UL[i * 3 + 1] ||
          LR[i * 3 + 1] != _LR[i * 3 + 1] ||
          UL[i * 3 + 2] != _UL[i * 3 + 2] ||
          LR[i * 3 + 2] != _LR[i * 3 + 2]
        ) {
          flag = true;
          break;
        }
      }
    }
    expect(flag).toBe(false);
  };
};

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
    CCLTest(img, width, width, width, img, 1, volume, UL, LR)
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
