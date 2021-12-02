import erosion from './erosion';

function sampleImg(dimension: 2 | 3): {
  input: Uint8Array;
  output: Uint8Array;
  width: number;
  height: number;
  nSlices: number;
  structure: {
    array: Uint8Array;
    width: number;
    height: number;
    nSlices: number;
  };
} {
  const [width, height, nSlices] = [10, 10, 3];
  const structure =
    dimension === 2
      ? {
          array: new Uint8Array([0, 1, 0, 1, 1, 1, 0, 1, 0]),
          width: 3,
          height: 3,
          nSlices: 1
        }
      : {
          array: new Uint8Array([
            0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1,
            0, 0, 0, 0
          ]),
          width: 3,
          height: 3,
          nSlices: 3
        };
  // prettier-ignore
  const input =  new Uint8Array([
          1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 1, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
          0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
          0, 0, 1, 1, 0, 0, 1, 1, 0, 0,
          0, 0, 1, 1, 0, 0, 1, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
          0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
          0, 0, 0, 0, 0, 0, 1, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 1, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 1
        ]);
  // prettier-ignore
  const output =  dimension === 2 ? new Uint8Array([
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]): new Uint8Array([
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0
]);

  return {
    input: input,
    output: output,
    width: width,
    height: height,
    nSlices: nSlices,
    structure: structure
  };
}

function erosionTest(
  array: Uint8Array,
  width: number,
  height: number,
  nSlices: number,
  answer: Uint8Array,
  structure: {
    array: Uint8Array;
    width: number;
    height: number;
    nSlices: number;
  }
) {
  return () => {
    const result = erosion(array, width, height, nSlices, structure);
    let flag = false;
    for (let i = 0; i < width * height * nSlices; i++) {
      if (result[i] !== answer[i]) {
        flag = true;
        break;
      }
    }

    expect(flag).toBe(false);
  };
}

describe('erosion: black', () => {
  const [width, height, nSlices] = [16, 16, 16];
  const input = new Uint8Array(width * height * nSlices);
  const structure2d = {
    array: new Uint8Array([0, 1, 0, 1, 1, 1, 0, 1, 0]),
    width: 3,
    height: 3,
    nSlices: 1
  };
  const structure3d = {
    // prettier-ignore
    array: new Uint8Array([
      0, 0, 0, 
      0, 1, 0, 
      0, 0, 0, 
      
      0, 1, 0, 
      1, 1, 1, 
      0, 1, 0, 

      0, 0, 0, 
      0, 1, 0, 
      0, 0, 0
    ]),
    width: 3,
    height: 3,
    nSlices: 3
  };
  test(
    '2D erosion',
    erosionTest(input, width, height, nSlices, input, structure2d)
  );
  test(
    '3D erosion',
    erosionTest(input, width, height, nSlices, input, structure3d)
  );
});

describe('erosion: sampleImg', () => {
  const { input, output, width, height, nSlices, structure } = sampleImg(2);
  test(
    '2D erosion',
    erosionTest(input, width, height, nSlices, output, structure)
  );
});

describe('erosion: sampleImg', () => {
  const { input, output, width, height, nSlices, structure } = sampleImg(3);
  test(
    '3D erosion',
    erosionTest(input, width, height, nSlices, output, structure)
  );
});
