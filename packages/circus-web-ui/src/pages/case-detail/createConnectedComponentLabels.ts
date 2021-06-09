import CCL6 from '@utrad-ical/circus-rs/src/common/CCL/ConnectedComponentLabeling3D6';
import CCL26 from '@utrad-ical/circus-rs/src/common/CCL/ConnectedComponentLabeling3D26';
import { alert } from '@smikitky/rb-components/lib/modal';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';

const createConnectedComponentLabels = (
  dispLabelNumber: number,
  neighbors4or6: boolean
) => {
  return async (
    input: Uint8Array,
    width: number,
    height: number,
    nSlices: number,
    name: string
  ) => {
    let labelingResults: LabelingResults3D | undefined = undefined;
    try {
      labelingResults = neighbors4or6
        ? CCL6(input, width, height, nSlices)
        : CCL26(input, width, height, nSlices);
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
    const nameTable = [
      'the largest CC',
      'the 2nd largest CC',
      'the 3rd largest CC',
      'the 4th largest CC',
      'the 5th largest CC',
      'the 6th largest CC',
      'the 7th largest CC',
      'the 8th largest CC',
      'the 9th largest CC',
      'the 10th largest CC',
      'the 11th largest CC',
      `the rest (${labelingResults.labelNum - dispLabelNumber}) CCs`
    ];
    const names =
      labelingResults.labelNum <= dispLabelNumber + 1
        ? nameTable.slice(0, labelingResults.labelNum)
        : nameTable.slice(0, dispLabelNumber).concat(nameTable[11]);

    labelingResults.labels.shift();
    const order = [...Array(labelingResults.labelNum)].map((_, i) => i);

    order.sort((a, b) => {
      return (
        labelingResults!.labels[b].volume - labelingResults!.labels[a].volume
      );
    });
    const relabel = new Array(order.length);
    for (let i = 0; i < order.length; i++) {
      relabel[order[i]] = i + 1;
    }
    labelingResults.labelMap = labelingResults.labelMap.map(i => {
      return i === 0 ? 0 : relabel[i - 1];
    });
    labelingResults.labels.sort((a, b) => {
      return b.volume - a.volume;
    });

    for (let num = dispLabelNumber + 1; num < labelingResults.labelNum; num++) {
      for (let i = 0; i < 3; i++) {
        if (
          labelingResults.labels[num].min[i] <
          labelingResults.labels[dispLabelNumber].min[i]
        ) {
          labelingResults.labels[dispLabelNumber].min[i] =
            labelingResults.labels[num].min[i];
        }
        if (
          labelingResults.labels[dispLabelNumber].max[i] <
          labelingResults.labels[num].max[i]
        ) {
          labelingResults.labels[dispLabelNumber].max[i] =
            labelingResults.labels[num].max[i];
        }
      }
      labelingResults.labels[dispLabelNumber].volume +=
        labelingResults.labels[num].volume;
      for (
        let k = labelingResults.labels[num].min[2];
        k <= labelingResults.labels[num].max[2];
        k++
      ) {
        for (
          let j = labelingResults.labels[num].min[1];
          j <= labelingResults.labels[num].max[1];
          j++
        ) {
          for (
            let i = labelingResults.labels[num].min[0];
            i <= labelingResults.labels[num].max[0];
            i++
          ) {
            const pos = i + j * width + k * width * height;
            if (labelingResults.labelMap[pos] === num + 1) {
              labelingResults.labelMap[pos] = dispLabelNumber + 1;
            }
          }
        }
      }
    }
    labelingResults.labelNum = names.length;

    return {
      labelingResults: labelingResults,
      names: names
    };
  };
};

export default createConnectedComponentLabels;
