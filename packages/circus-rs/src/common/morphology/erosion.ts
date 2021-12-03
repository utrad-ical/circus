const defaultStructure = {
  array: new Uint8Array([0, 1, 0, 1, 1, 1, 0, 1, 0]),
  width: 3,
  height: 3,
  nSlices: 1
};

/**
 * @param array input binary image
 * @param width width of array
 * @param height height of array
 * @param nSlices slice number of array
 * @param structure {array, width, height, nSlices} structuring element used for the erosion
 */
const erosion: (
  array: Uint8Array,
  width: number,
  height: number,
  nSlices?: number,
  structure?: {
    array: Uint8Array;
    width: number;
    height: number;
    nSlices: number;
  },
  iteration?: number
) => Uint8Array = (
  array,
  width,
  height,
  nSlices = 1,
  structure = defaultStructure,
  iteration = 1
) => {
  let input = array.slice(0);
  const output = new Uint8Array(width * height * nSlices);
  const centre = [
    Math.floor(structure.nSlices / 2),
    Math.floor(structure.height / 2),
    Math.floor(structure.width / 2)
  ];
  if (
    structure.array[
      centre[2] +
        centre[1] * structure.width +
        centre[0] * structure.width * structure.height
    ] === 0
  ) {
    throw new Error(`invalid structure.`);
  }
  const dx: number[] = [];
  const dy: number[] = [];
  const dz: number[] = [];
  let structure_pos = 0;
  for (let z = -centre[0]; z <= centre[0]; z++) {
    for (let y = -centre[1]; y <= centre[1]; y++) {
      for (let x = -centre[2]; x <= centre[2]; x++) {
        if (
          structure.array[structure_pos] &&
          !(z === 0 && y === 0 && x === 0)
        ) {
          dx.push(x);
          dy.push(y);
          dz.push(z);
        }
        structure_pos++;
      }
    }
  }
  const dmin = [Math.min(...dz), Math.min(...dy), Math.min(...dx)];
  const dmax = [Math.max(...dz), Math.max(...dy), Math.max(...dx)];

  for (let ite = 0; ite < iteration; ite++) {
    if (ite !== 0) {
      input = output.slice(0);
      output.fill(0);
    }
    for (let k = 0; k < nSlices; k++) {
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const pos = i + j * width + k * width * height;
          if (
            input[pos] === 0 ||
            i + dmin[2] < 0 ||
            j + dmin[1] < 0 ||
            k + dmin[0] < 0 ||
            width <= i + dmax[2] ||
            height <= j + dmax[1] ||
            nSlices <= k + dmax[0]
          )
            continue;
          structure_pos = 0;
          let flag = true;

          for (structure_pos = 0; structure_pos < dx.length; structure_pos++) {
            const tmp_pos =
              i +
              dx[structure_pos] +
              (j + dy[structure_pos]) * width +
              (k + dz[structure_pos]) * width * height;
            if (input[tmp_pos] === 0) {
              flag = false;
              break;
            }
          }
          if (flag) output[pos] = 1;
        }
      }
    }
  }
  return output;
};

export default erosion;
