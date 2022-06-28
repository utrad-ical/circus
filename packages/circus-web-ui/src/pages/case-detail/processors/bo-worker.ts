import RawData from '@utrad-ical/circus-rs/src/common/RawData';
import { createNewLabelData, InternalLabelOf } from '../labelData';

const ctx: DedicatedWorkerGlobalScope = self as any;

ctx.addEventListener('message', event => {
  const { label, targetLabel, operation, temporaryKey, appearance } =
    event.data;
  const size1 = label.data.size;
  const origin1 = label.data.origin;
  const size2 = targetLabel.data.size;
  const origin2 = targetLabel.data.origin;

  let ULx: number,
    ULy: number,
    ULz: number,
    LRx: number,
    LRy: number,
    LRz: number;
  if (operation === 'add') {
    ULx = Math.min(origin1[0], origin2[0]);
    ULy = Math.min(origin1[1], origin2[1]);
    ULz = Math.min(origin1[2], origin2[2]);
    LRx = Math.max(origin1[0] + size1[0], origin2[0] + size2[0]);
    LRy = Math.max(origin1[1] + size1[1], origin2[1] + size2[1]);
    LRz = Math.max(origin1[2] + size1[2], origin2[2] + size2[2]);
  } else if (operation === 'subtract') {
    [ULx, ULy, ULz] = origin1;
    LRx = ULx + size1[0];
    LRy = ULy + size1[1];
    LRz = ULz + size1[2];
  } else {
    ULx = Math.max(origin1[0], origin2[0]);
    ULy = Math.max(origin1[1], origin2[1]);
    ULz = Math.max(origin1[2], origin2[2]);
    LRx = Math.min(origin1[0] + size1[0], origin2[0] + size2[0]);
    LRy = Math.min(origin1[1] + size1[1], origin2[1] + size2[1]);
    LRz = Math.min(origin1[2] + size1[2], origin2[2] + size2[2]);
  }

  const label1 = new RawData(size1, 'binary');
  label1.assign(label.data.volumeArrayBuffer!);
  const label2 = new RawData(size2, 'binary');
  label2.assign(targetLabel.data.volumeArrayBuffer!);

  const newLabel: InternalLabelOf<'voxel'> = {
    temporaryKey: temporaryKey,
    name: `(${label.name})${
      operation === 'add' ? ' + ' : operation === 'subtract' ? ' - ' : ' ∩ '
    }(${targetLabel.name})`,
    ...createNewLabelData('voxel', appearance),
    attributes: {},
    hidden: false
  };
  newLabel.data.size = [LRx - ULx, LRy - ULy, LRz - ULz];
  newLabel.data.origin = [ULx, ULy, ULz];
  const volume = new RawData([LRx - ULx, LRy - ULy, LRz - ULz], 'binary');
  const isInside = (
    pos: { i: number; j: number; k: number },
    origin: number[],
    size: number[]
  ) => {
    const { i, j, k } = pos;
    return (
      origin[0] <= i &&
      i < origin[0] + size[0] &&
      origin[1] <= j &&
      j < origin[1] + size[1] &&
      origin[2] <= k &&
      k < origin[2] + size[2]
    );
  };
  for (let k = ULz; k < LRz; k++) {
    for (let j = ULy; j < LRy; j++) {
      for (let i = ULx; i < LRx; i++) {
        if (operation === 'add') {
          if (
            (isInside({ i, j, k }, origin1, size1) &&
              0 <
                label1.getPixelAt(
                  i - origin1[0],
                  j - origin1[1],
                  k - origin1[2]
                )) ||
            (isInside({ i, j, k }, origin2, size2) &&
              0 <
                label2.getPixelAt(
                  i - origin2[0],
                  j - origin2[1],
                  k - origin2[2]
                ))
          )
            volume.writePixelAt(1, i - ULx, j - ULy, k - ULz);
        } else if (operation === 'subtract') {
          if (
            0 <
              label1.getPixelAt(
                i - origin1[0],
                j - origin1[1],
                k - origin1[2]
              ) &&
            (isInside({ i, j, k }, origin2, size2)
              ? label2.getPixelAt(
                  i - origin2[0],
                  j - origin2[1],
                  k - origin2[2]
                ) === 0
              : true)
          )
            volume.writePixelAt(1, i - ULx, j - ULy, k - ULz);
        } else {
          if (
            0 <
              label1.getPixelAt(
                i - origin1[0],
                j - origin1[1],
                k - origin1[2]
              ) &&
            0 <
              label2.getPixelAt(i - origin2[0], j - origin2[1], k - origin2[2])
          )
            volume.writePixelAt(1, i - ULx, j - ULy, k - ULz);
        }
      }
    }
  }
  newLabel.data.volumeArrayBuffer = volume.data;
  ctx.postMessage(newLabel);
  ctx.close();
});
