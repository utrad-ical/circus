import HoleFilling2D, {
  HoleFilling3D
} from '@utrad-ical/circus-rs/src/common/CCL/holeFilling';
import { alert } from '@smikitky/rb-components/lib/modal';

const createHoleFilledLabels = (
  dimension3: boolean,
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
      holeFillingResult = dimension3
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
    let output = holeFillingResult.result.slice();
    return {
      labelingResults: {
        labelMap: output,
        labelNum: 1,
        labels: [
          {
            volume: holeFillingResult.holeVolume,
            min: [0, 0, 0],
            max: [width, height, nSlices]
          }
        ]
      },
      names: [
        `${name}: ${dimension3 ? 3 : 2}D hole filling${
          !dimension3 ? ' (' + orientation + ')' : ''
        }`
      ]
    };
  };
};

export default createHoleFilledLabels;
