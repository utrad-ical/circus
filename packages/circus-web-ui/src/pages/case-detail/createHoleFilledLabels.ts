import HoleFilling2D, {
  HoleFilling3D
} from '@utrad-ical/circus-rs/src/common/CCL/holeFilling';
import { alert } from '@smikitky/rb-components/lib/modal';

const createHoleFilledLabels = (
  dimension: number,
  orientation: 'Axial' | 'Coronal' | 'Sagital' | null,
  neighbors4or6: boolean
) => {
  return async (
    input: Uint8Array,
    width: number,
    height: number,
    nSlices: number,
    name: string
  ) => {
    let holeFillingResult:
      | { result: Uint8Array; holeNum: number; holeVolume: number }
      | undefined = undefined;
    try {
      holeFillingResult =
        dimension === 3
          ? HoleFilling3D(input, width, height, nSlices, neighbors4or6 ? 6 : 26)
          : orientation === 'Axial'
          ? HoleFilling2D(input, width, height, nSlices, neighbors4or6 ? 4 : 8)
          : orientation === 'Sagital'
          ? HoleFilling2D(input, height, nSlices, width, neighbors4or6 ? 4 : 8)
          : HoleFilling2D(input, nSlices, width, height, neighbors4or6 ? 4 : 8);
    } catch (err) {
      console.log('error', err.message);
      alert(`${name} is too complex.\nPlease modify ${name}.`);
      return {
        labelingResults: {
          labelMap: new Uint8Array(0),
          labelNum: 0,
          labels: new Array(0)
        },
        names: ['']
      };
    }
    const output = holeFillingResult.result.slice();
    return {
      labelingResults: {
        labelMap: output,
        labelNum: 1,
        labels: [
          {
            volume: holeFillingResult.holeVolume,
            min: [0, 0, 0],
            max: [width - 1, height - 1, nSlices - 1]
          }
        ]
      },
      names: [
        `${name}: ${dimension}D hole filling${
          dimension !== 3 ? ' (' + orientation + ')' : ''
        }`
      ]
    };
  };
};

export default createHoleFilledLabels;
