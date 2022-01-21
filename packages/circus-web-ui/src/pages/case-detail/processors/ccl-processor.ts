import { alert } from '@smikitky/rb-components/lib/modal';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import CCL26 from '@utrad-ical/circus-rs/src/common/CCL/ConnectedComponentLabeling3D26';
import CCL6 from '@utrad-ical/circus-rs/src/common/CCL/ConnectedComponentLabeling3D6';
import cclWorker from 'worker-loader!./ccl-worker';
import performLabelCreatingVoxelProcessing, {
  VoxelLabelProcessor
} from './performLabelCreatingVoxelProcessing';

export interface CclOptions {
  maxOutputComponents: number;
  neighbors: 6 | 26;
  bufferSize: number;
}

const cclVoxelProcessor: VoxelLabelProcessor<LabelingResults3D, CclOptions> =
  props => {
    const {
      options: { maxOutputComponents, neighbors, bufferSize },
      input,
      width,
      height,
      nSlices,
      name,
      postProcessor,
      reportProgress
    } = props;

    const relabeling = (results: LabelingResults3D) => {
      const nameTable = [
        'largest CC',
        '2nd largest CC',
        '3rd largest CC',
        '4th largest CC',
        '5th largest CC',
        '6th largest CC',
        '7th largest CC',
        '8th largest CC',
        '9th largest CC',
        '10th largest CC',
        '11th largest CC',
        `remaining (${results.labelNum - maxOutputComponents}) CCs`
      ];
      const names =
        results.labelNum <= maxOutputComponents + 1
          ? nameTable.slice(0, results.labelNum)
          : nameTable.slice(0, maxOutputComponents).concat(nameTable[11]);

      results.labels.shift();
      const order = [...Array(results.labelNum)].map((_, i) => i);

      order.sort((a, b) => {
        return results.labels[b].volume - results!.labels[a].volume;
      });
      const relabel = new Array(order.length);
      for (let i = 0; i < order.length; i++) {
        relabel[order[i]] = i + 1;
      }
      results.labelMap = results.labelMap.map((i: number) => {
        return i === 0 ? 0 : relabel[i - 1];
      });
      results.labels.sort(
        (
          a: LabelingResults3D['labels'][0],
          b: LabelingResults3D['labels'][0]
        ) => {
          return b.volume - a.volume;
        }
      );

      for (let num = maxOutputComponents + 1; num < results.labelNum; num++) {
        for (let i = 0; i < 3; i++) {
          if (
            results.labels[num].min[i] <
            results.labels[maxOutputComponents].min[i]
          ) {
            results.labels[maxOutputComponents].min[i] =
              results.labels[num].min[i];
          }
          if (
            results.labels[maxOutputComponents].max[i] <
            results.labels[num].max[i]
          ) {
            results.labels[maxOutputComponents].max[i] =
              results.labels[num].max[i];
          }
        }
        results.labels[maxOutputComponents].volume +=
          results.labels[num].volume;
        for (
          let k = results.labels[num].min[2];
          k <= results.labels[num].max[2];
          k++
        ) {
          for (
            let j = results.labels[num].min[1];
            j <= results.labels[num].max[1];
            j++
          ) {
            for (
              let i = results.labels[num].min[0];
              i <= results.labels[num].max[0];
              i++
            ) {
              const pos = i + j * width + k * width * height;
              if (results.labelMap[pos] === num + 1) {
                results.labelMap[pos] = maxOutputComponents + 1;
              }
            }
          }
        }
      }
      results.labelNum = names.length;
      return {
        processingResults: results,
        names: names
      };
    };

    let labelingResults: LabelingResults3D = {
      labelMap: new Uint8Array(0),
      labelNum: 0,
      labels: new Array(0)
    };
    if (window.Worker) {
      const myWorker = new cclWorker();
      myWorker.postMessage({
        input,
        width,
        height,
        nSlices,
        neighbors,
        bufferSize
      });
      myWorker.onmessage = (e: any) => {
        if (typeof e.data === 'string') {
          reportProgress({ value: 100, label: 'Failed', finished: true });
          alert(`${name} is too complex.\nPlease modify ${name}.`);
          return;
        }
        postProcessor(relabeling(e.data));
        reportProgress({ value: 100, label: 'Completed', finished: true });
      };
    } else {
      console.log('× window.Worker');
      try {
        labelingResults =
          neighbors === 6
            ? CCL6(input, width, height, nSlices, bufferSize)
            : CCL26(input, width, height, nSlices, bufferSize);
      } catch (err: any) {
        console.log('error', err.message);
        alert(`${name} is too complex.\nPlease modify ${name}.`);
        return;
      }
      postProcessor(relabeling(labelingResults));
      reportProgress({ value: 100, label: 'Completed', finished: true });
    }
  };

const cclProcessor = performLabelCreatingVoxelProcessing(cclVoxelProcessor);
export default cclProcessor;
