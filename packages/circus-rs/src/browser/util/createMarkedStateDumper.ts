import { Vector3, Box3 } from 'three';
import { VoxelMarker } from './voxelMarker';

export default function createMarkedStateDumper(marked: VoxelMarker['marked']) {
  return (boundary: Box3): string => {
    const { min, max } = boundary;
    let dumpString = new Array(max.y - min.y + 2).fill('').join('\n');

    dumpString = dumpString
      .split('\n')
      .map(
        (v, i) =>
          v +
          (0 < i
            ? (min.y + i - 1).toString().padStart(5, ' ')
            : ''.padStart(5, ' '))
      )
      .join('\n');

    for (let z = min.z; z <= max.z; z++) {
      let slice = '[' + z.toString() + ']';
      while (slice.length <= max.x - min.x) {
        slice += ' ';
      }
      slice += '\n';

      for (let y = min.y; y <= max.y; y++) {
        for (let x = min.x; x <= max.x; x++) {
          slice += marked(new Vector3(x, y, z)) ? '*' : '-';
        }
        slice += '\n';
      }

      const sliceLines = slice.split('\n');
      dumpString = dumpString
        .split('\n')
        .map((v, i) => v + '|' + sliceLines[i])
        .join('\n');
    }
    dumpString = dumpString
      .split('\n')
      .map((v, i) => v + '|')
      .join('\n');
    return 'x: ' + min.x + ' - ' + max.x + '\n' + dumpString;
  };
}
