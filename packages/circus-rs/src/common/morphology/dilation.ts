import { Structure, BasicMorphologicalOperation } from './morphology-types';

const defaultStructure: Structure = {
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
 * @param structure {array, width, height, nSlices} structuring element used for the dilation
 */
const dilation: BasicMorphologicalOperation = (
  array,
  width,
  height,
  nSlices = 1,
  structure = defaultStructure,
  iteration = 1
) => {
  let input = array.slice(0);
  const output = new Uint8Array(width * height * nSlices);
  const center = [
    Math.floor(structure.nSlices / 2),
    Math.floor(structure.height / 2),
    Math.floor(structure.width / 2)
  ];
  if (
    structure.array[
      center[2] +
        center[1] * structure.width +
        center[0] * structure.width * structure.height
    ] === 0
  ) {
    throw new Error(`Invalid structure.`);
  }
  const dx: number[] = [];
  const dy: number[] = [];
  const dz: number[] = [];
  let structure_pos = 0;
  for (let z = -center[0]; z <= center[0]; z++) {
    for (let y = -center[1]; y <= center[1]; y++) {
      for (let x = -center[2]; x <= center[2]; x++) {
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

  for (let ite = 0; ite < iteration; ite++) {
    if (ite !== 0) {
      input = output.slice(0);
      output.fill(0);
    }
    for (let k = 0; k < nSlices; k++) {
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const pos = i + j * width + k * width * height;
          if (input[pos] === 0) continue;
          structure_pos = 0;
          output[pos] = 1;
          for (structure_pos = 0; structure_pos < dx.length; structure_pos++) {
            if (
              i + dx[structure_pos] < 0 ||
              j + dy[structure_pos] < 0 ||
              k + dz[structure_pos] < 0 ||
              width <= i + dx[structure_pos] ||
              height <= j + dy[structure_pos] ||
              nSlices <= k + dz[structure_pos]
            )
              continue;

            const tmp_pos =
              i +
              dx[structure_pos] +
              (j + dy[structure_pos]) * width +
              (k + dz[structure_pos]) * width * height;
            output[tmp_pos] = 1;
          }
        }
      }
    }
  }
  return output;
};

export default dilation;
