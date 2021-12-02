import erosion from './erosion';
import dilation from './dilation';

const showStructure = (
  image: Uint8Array,
  width: number,
  height: number,
  nSlices: number
) => {
  const str = ['-', '1'];
  console.log('===structure===');
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      let line = '';
      for (let i = 0; i < width; i++) {
        const pos = i + j * width + k * width * height;
        line += image[pos] === 0 ? str[0] : str[1];
      }
      console.log(line);
    }
    console.log('='.repeat(15));
  }
};

const showImg = (
  image1: Uint8Array,
  image2: Uint8Array,
  width: number,
  height: number,
  nSlices: number
) => {
  const str = ['-', '1', '2', '&'];
  console.log(
    `background:${str[0]}, input:${str[1]}, output:${str[2]}, input&output:${str[3]}`
  );
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      let line = '';
      for (let i = 0; i < width; i++) {
        const pos = i + j * width + k * width * height;
        line +=
          image1[pos] === 0 && image2[pos] === 0
            ? str[0]
            : image1[pos] !== 0 && image2[pos] !== 0
            ? str[3]
            : image1[pos] !== 0
            ? str[1]
            : str[2];
      }
      console.log(line);
    }
    console.log('='.repeat(width));
  }
};

const [width, height, nSlices] = [10, 10, 3];
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

const structure2d = {
  array: new Uint8Array([0, 1, 0, 1, 1, 1, 0, 1, 0]),
  width: 3,
  height: 3,
  nSlices: 1
};
const structure3d = {
  array: new Uint8Array([
    0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0,
    0, 0
  ]),
  width: 3,
  height: 3,
  nSlices: 3
};
const output = erosion(input, width, height, nSlices, structure3d);
showStructure(
  structure3d.array,
  structure3d.width,
  structure3d.height,
  structure3d.nSlices
);

// const output = dilation(input, width, height, nSlices, structure2d);
// showStructure(
//   structure2d.array,
//   structure2d.width,
//   structure2d.height,
//   structure2d.nSlices
// );
console.log('\n');
showImg(input, output, width, height, nSlices);
