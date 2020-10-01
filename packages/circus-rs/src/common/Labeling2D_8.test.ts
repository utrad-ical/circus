import labeling2D from './Labeling2D_8';

function mosaic(
  width: number,
  height: number,
  NSlice: number
): [Uint8Array, Uint16Array, number] {
  const img = new Uint8Array(width * height * NSlice);
  const label = new Uint16Array(width * height * NSlice);
  let sum = 0;
  for (let k = 0; k < NSlice; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if ((i % 2) + (j % 2) === 1) {
          img[i + j * width + k * width * height] = 1 - (k % 2);
        } else {
          img[i + j * width + k * width * height] = k % 2;
        }
        label[i + j * width + k * width * height] =
          img[i + j * width + k * width * height] === 1 ? ++sum : 0;
      }
    }
  }
  return [img, label, sum];
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

function sampleImg(neighbor: number): [Uint8Array, Uint8Array, number] {
  // prettier-ignore
  const img =  new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
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
                               1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);
  if (neighbor === 4) {
    // prettier-ignore
    const label =  new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
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
                                   8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);
    return [img, label, 8];
  } else {
    // prettier-ignore
    const label =  new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
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
                                   4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);
    return [img, label, 4];
  }
}

const labelingTest = (
  array: Uint8Array,
  width: number,
  height: number,
  answer: Uint8Array | Uint16Array,
  labelNo: number
) => {
  return () => {
    let labeledImg, no;
    [labeledImg, no] = labeling2D(array, width, height);

    let flag = no !== labelNo ? true : false;
    if (flag === false) {
      for (let i = 0; i < width * height; i++) {
        if (labeledImg[i] !== answer[i]) {
          flag = true;
          break;
        }
      }
    }
    expect(flag).toBe(false);
  };
};

describe('labeling: Mosaic', () => {
  const width = 256;
  const [img, label, num] = mosaic(width, width, width);
  test(
    '2D 8-neighbor',
    labelingTest(
      img.slice(0, width * width),
      width,
      width,
      img.slice(0, width * width),
      1
    )
  );
});

describe('labeling: black', () => {
  const width = 1024;

  test(
    '2D 8-neighbor',
    labelingTest(
      black(width, width, 1),
      width,
      width,
      black(width, width, 1),
      0
    )
  );
});

describe('labeling: white', () => {
  const width = 1024;

  test(
    '2D white 8-neighbor',
    labelingTest(
      white(width, width, 1),
      width,
      width,
      white(width, width, 1),
      1
    )
  );
});

describe('labeling: sampleImg', () => {
  let width, height, str;
  [width, height] = [16, 16];
  str = `2D`;
  str = `${str} sampleImg 8-neighbor`;
  const [img, label, num] = sampleImg(8);
  test(str, labelingTest(img, width, height, label, num));
});
