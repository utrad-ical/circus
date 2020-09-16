import { labeling2D } from './Labeling';
import labeling3D from './Labeling';

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
          img[i + j * width + k * width * NSlice] = 1 - (k % 2);
        } else {
          img[i + j * width + k * width * NSlice] = k % 2;
        }
        label[i + j * width + k * width * NSlice] =
          img[i + j * width + k * width * NSlice] === 1 ? ++sum : 0;
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
  const [width, height, NSlice] = [16, 16, 16];
  if (neighbor === 6 || neighbor === 26) {
    // prettier-ignore
    const img =  new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
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
                                 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ]);
    if (neighbor === 6) {
      // prettier-ignore
      const label = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
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
                                    0, 0, 0, 0, 0, 0, 0, 0, 0, 6 ]);
      return [img, label, 6];
    } else {
      // prettier-ignore
      const label = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
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
                                    0, 0, 0, 0, 0, 0, 0, 0, 0, 3 ]);
      return [img, label, 3];
    }
  } else {
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
}

const labelingTest = (
  array: Uint8Array,
  width: number,
  height: number,
  NSlice: number,
  neighbor: number,
  answer: Uint8Array | Uint16Array,
  labelNo: number
) => {
  return () => {
    let labeledImg, no;
    if (NSlice > 0) {
      [labeledImg, no] = labeling3D(array, width, height, NSlice, neighbor);
    } else {
      [labeledImg, no] = labeling2D(array, width, height, neighbor);
      NSlice = 1;
    }
    let flag = no !== labelNo ? true : false;
    if (flag === false) {
      for (let i = 0; i < width * height * NSlice; i++) {
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
  const width = 16;
  const [img, label, num] = mosaic(width, width, width);
  test('3D 6-neighbor', labelingTest(img, width, width, width, 6, label, num));
  test('3D 26-neighbor', labelingTest(img, width, width, width, 26, img, 1));
  test(
    '2D 4-neighbor',
    labelingTest(
      img.slice(0, width * width),
      width,
      width,
      0,
      4,
      label.slice(0, width * width),
      (width * width) / 2
    )
  );
  test(
    '2D 8-neighbor',
    labelingTest(
      img.slice(0, width * width),
      width,
      width,
      0,
      8,
      img.slice(0, width * width),
      1
    )
  );
});

describe('labeling: black', () => {
  const width = 16;
  const [img, label, num] = mosaic(width, width, width);

  test(
    '3D 6-neighbor',
    labelingTest(
      black(width, width, width),
      width,
      width,
      width,
      6,
      black(width, width, width),
      0
    )
  );
  test(
    '3D 26-neighbor',
    labelingTest(
      black(width, width, width),
      width,
      width,
      width,
      26,
      black(width, width, width),
      0
    )
  );
  test(
    '2D 4-neighbor',
    labelingTest(
      black(width, width, 1),
      width,
      width,
      0,
      4,
      black(width, width, 1),
      0
    )
  );
  test(
    '2D 8-neighbor',
    labelingTest(
      black(width, width, 1),
      width,
      width,
      0,
      8,
      black(width, width, 1),
      0
    )
  );
});

describe('labeling: white', () => {
  const width = 512;
  const [img, label, num] = mosaic(width, width, width);

  test(
    '3D white 6-neighbor',
    labelingTest(
      white(width, width, width),
      width,
      width,
      width,
      6,
      white(width, width, width),
      1
    )
  );
  test(
    '3D white 26-neighbor',
    labelingTest(
      white(width, width, width),
      width,
      width,
      width,
      26,
      white(width, width, width),
      1
    )
  );
  test(
    '2D white 4-neighbor',
    labelingTest(
      white(width, width, 1),
      width,
      width,
      0,
      4,
      white(width, width, 1),
      1
    )
  );
  test(
    '2D white 8-neighbor',
    labelingTest(
      white(width, width, 1),
      width,
      width,
      0,
      8,
      white(width, width, 1),
      1
    )
  );
});

describe('labeling: sampleImg', () => {
  for (const n of [6, 26, 4, 8]) {
    let width, height, NSlice, str;
    if (n % 4 === 0) {
      [width, height, NSlice] = [16, 16, 0];
      str = `2D`;
    } else {
      [width, height, NSlice] = [10, 10, 3];
      str = '3D';
    }
    str = `${str} sampleImg ${n}-neighbor`;
    const [img, label, num] = sampleImg(n);
    test(str, labelingTest(img, width, height, NSlice, n, label, num));
  }
});

describe('3D labeling: 1 slice', () => {
  const [width, height, NSlice] = [16, 16, 1];
  let [img, label, num] = sampleImg(4);
  test(
    `3D sampleImg 6-neighbor`,
    labelingTest(img, width, height, NSlice, 6, label, num)
  );
  [img, label, num] = sampleImg(8);
  test(
    `3D sampleImg 26-neighbor`,
    labelingTest(img, width, height, NSlice, 26, label, num)
  );
});
