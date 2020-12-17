import HoleFilling2D, { HoleFilling3D } from './holeFilling';

const mosaic = (
  width: number,
  height: number,
  NSlice: number,
  neightbor: 4 | 6 | 8 | 26
): [Uint8Array, Uint8Array, number] => {
  const img = new Uint8Array(width * height * NSlice);
  let holeNum = 0;

  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos = i + width * (j + k * height);
        if ((i % 2) + (j % 2) === 1) {
          img[pos] = 1 - (k % 2);
        } else {
          img[pos] = k % 2;
        }
      }
    }
  }

  if (neightbor === 8 || neightbor === 26) {
    return [img, img, holeNum];
  }

  const answer = img.slice();
  if (neightbor === 6) {
    for (let k = 1; k < NSlice - 1; k++) {
      for (let j = 1; j < height - 1; j++) {
        for (let i = 1; i < width - 1; i++) {
          answer[i + j * width + k * width * height] = 1;
          if (img[i + j * width + k * width * height] === 0) holeNum++;
        }
      }
    }
  }
  if (neightbor === 4) {
    for (let k = 0; k < NSlice; k++) {
      for (let j = 1; j < height - 1; j++) {
        for (let i = 1; i < width - 1; i++) {
          answer[i + j * width + k * width * height] = 1;
          if (img[i + j * width + k * width * height] === 0) holeNum++;
        }
      }
    }
  }

  return [img, answer, holeNum];
};

function HolleFillingTest(
  array: Uint8Array,
  width: number,
  height: number,
  NSlice: number,
  answer: Uint8Array,
  holeNum: number,
  holeVolume: number,
  dimension: number,
  neighbor: number
) {
  return () => {
    const holeFillingResult =
      dimension === 3
        ? HoleFilling3D(array, width, height, NSlice, neighbor === 26 ? 26 : 6)
        : HoleFilling2D(array, width, height, NSlice, neighbor === 8 ? 8 : 4);
    let flag =
      holeNum === holeFillingResult.holeNum
        ? holeVolume === holeFillingResult.holeVolume
          ? false
          : true
        : true;
    if (!flag) {
      for (let i = 0; i < width * height * NSlice; i++) {
        if (holeFillingResult.result[i] !== answer[i]) {
          flag = true;
          break;
        }
      }
    }
    expect(flag).toBe(false);
  };
}

describe('holeFilling: frame', () => {
  const [width, height, nSLices] = [5, 5, 5];
  const img = new Uint8Array(width * height * nSLices).map(() => 1);
  const answer = img.slice();
  let holeVolume = 0;

  for (let k = 1; k < nSLices - 1; k++) {
    for (let j = 1; j < height - 1; j++) {
      for (let i = 1; i < width - 1; i++) {
        img[i + j * width + k * width * height] = 0;
        holeVolume++;
      }
    }
  }

  test(
    '3D 6-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 1, holeVolume, 3, 6)
  );
  test(
    '3D 26-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 1, holeVolume, 3, 26)
  );
  test(
    '2D 4-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 3, holeVolume, 2, 4)
  );
  test(
    '2D 8-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 3, holeVolume, 2, 8)
  );
});

describe('holeFilling: white', () => {
  const [width, height, nSLices] = [5, 5, 5];
  const img = new Uint8Array(width * height * nSLices);
  const answer = img.slice();

  test(
    '3D 6-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 0, 0, 3, 6)
  );
  test(
    '3D 26-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 0, 0, 3, 26)
  );
  test(
    '2D 4-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 0, 0, 2, 4)
  );
  test(
    '2D 8-neighbor',
    HolleFillingTest(img, width, height, nSLices, answer, 0, 0, 2, 8)
  );
});

describe('holeFilling: mosaic', () => {
  const [width, height, nSLices] = [5, 5, 5];

  const [img6, answer6, holeNum6] = mosaic(width, height, nSLices, 6);
  test(
    '3D 6-neighbor',
    HolleFillingTest(
      img6,
      width,
      height,
      nSLices,
      answer6,
      holeNum6,
      holeNum6,
      3,
      6
    )
  );
  const [img26, answer26, holeNum26] = mosaic(width, height, nSLices, 26);
  test(
    '3D 26-neighbor',
    HolleFillingTest(img26, width, height, nSLices, answer26, 0, 0, 3, 26)
  );
  const [img4, answer4, holeNum4] = mosaic(width, height, nSLices, 4);
  test(
    '2D 4-neighbor',
    HolleFillingTest(
      img4,
      width,
      height,
      nSLices,
      answer4,
      holeNum4,
      holeNum4,
      2,
      4
    )
  );
  const [img8, answer8, holeNum8] = mosaic(width, height, nSLices, 8);
  test(
    '2D 8-neighbor',
    HolleFillingTest(img8, width, height, nSLices, answer8, 0, 0, 2, 8)
  );
});
