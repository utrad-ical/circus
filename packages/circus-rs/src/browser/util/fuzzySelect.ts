import { Vector3, Box3 } from 'three';
import { RawData, Vector3D } from '..';

/**
 * bluh bluh bluh bluh bluh bluh
 * @todo implement this function(now this is stub)
 */
export default function fuzzySelect(
  volume: RawData,
  startPoint: Vector3,
  bounding: Box3,
  threshold: number
): RawData {
  const origin = bounding.min;
  const size = bounding
    .getSize(new Vector3())
    .addScalar(1)
    .toArray() as Vector3D;

  const voxels = size[0] * size[1] * size[2];

  // Todo: Remove this code (and the function) if the requirement
  // that the size must be divisible by 8 is removed.
  adjustSizeToDivisible8(size);

  const selectedRawData = new RawData(size, 'binary');

  const baseValue = volume.getPixelAt(startPoint.x, startPoint.y, startPoint.z);
  const maxValue = baseValue + threshold;
  const minValue = baseValue - threshold;

  console.log('BEGIN');
  console.time('floodFill3D w/o write to partial cloud');
  // const marker = stupidMarker();
  // const marker = objectMarker();
  const marker = bufferMarker(bounding);
  const binarize = (p: Vector3) => {
    const value = volume.getPixelAt(p.x, p.y, p.z);
    return minValue <= value && value <= maxValue;
  };
  let callCounter = 0;
  let filled = 0;
  const fillLine = (p1: Vector3, p2: Vector3) => {
    ++callCounter;
    for (let x = p1.x; x <= p2.x; x++) {
      ++filled;
      selectedRawData.writePixelAt(
        1,
        x - origin.x,
        p1.y - origin.y,
        p1.z - origin.z
      );
    }
  };
  floodFill3D(startPoint, bounding, binarize, fillLine, marker);
  console.timeEnd('floodFill3D w/o write to partial cloud');
  console.log('call: ' + callCounter.toString());
  console.log(
    'filled: ' +
      filled.toString() +
      ' ' +
      (Math.round((filled / voxels) * 10000) / 100).toString() +
      '%'
  );

  // selectedRawData.fillAll(1);
  return selectedRawData;
}

function adjustSizeToDivisible8(size: Vector3D) {
  if (size[0] % 8 !== 0) {
    size[0] = Math.ceil(size[0] / 8) * 8;
  }
}

interface LineMarker {
  marked(p: Vector3): boolean;
  marks(p1: Vector3, xend: number): void;
}
const markStateDumper = (marked: LineMarker['marked']) => {
  return (boundary: Box3): string => {
    const { min, max } = boundary;
    let dumpString = '';
    for (let z = min.z; z <= max.z; z++) {
      dumpString += '[' + z.toString() + ']\n';
      for (let y = min.y; y <= max.y; y++) {
        for (let x = min.x; x <= max.x; x++) {
          dumpString += marked(new Vector3(x, y, z)) ? '*' : '-';
        }
        dumpString += '\n';
      }
    }
    return dumpString;
  };
};
const markStateColDumper = (marked: LineMarker['marked']) => {
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
};
const bufferMarker = (boundary: Box3): LineMarker => {
  const { min } = boundary;
  const [width, height, depth] = boundary
    .getSize(new Vector3())
    .addScalar(1)
    .toArray();

  const buffer = new Uint8Array(width * height * depth);
  const getOffset = (p: Vector3) =>
    (p.z - min.z) * height * width + (p.y - min.y) * width + (p.x - min.x);

  const marks = (p: Vector3, xend: number) => {
    let offset = getOffset(p);
    for (let x = p.x; x <= xend; x++) {
      // console.error(
      //   'marks: ' +
      //     new Vector3(x, p.y, p.z).toArray().toString() +
      //     '(' +
      //     offset.toString() +
      //     ')'
      // );
      buffer[offset++] = 1;
    }
  };
  const marked = (p: Vector3) => buffer[getOffset(p)] === 1;
  // const marked = (p: Vector3) => {
  //   const o = getOffset(p);
  //   const r = buffer[getOffset(p)] === 1;
  //   if (r) {
  //     console.error('marked: '+p.toArray().toString() + '(' + o.toString()+')');
  //   }
  //   return r;
  // };

  return { marked, marks };
};
const objectMarker = (): LineMarker => {
  const collection: Record<string, true> = {};
  const key = (p: Vector3): string =>
    p.x.toString() + ',' + p.y.toString() + ',' + p.z.toString();

  const marks = (p: Vector3, xend: number) => {
    const cur = p.clone();
    for (; cur.x <= xend; cur.x++) {
      collection[key(cur)] = true;
    }
  };
  const marked = (p: Vector3) => key(p) in collection;

  return { marked, marks };
};
const stupidMarker = (): LineMarker => {
  const collection: [number, number, number][] = [];

  const marks = (p: Vector3, xend: number) => {
    for (let x = p.x; x <= xend; x++) {
      collection.push([x, p.y, p.z]);
    }
  };
  const marked = (p: Vector3) =>
    collection.some(q => q[0] === p.x && q[1] === p.y && q[2] === p.z);

  return { marked, marks };
};

// This function does NOT take into account that the specified functions
// might modify the argument points.
// DON'T do that.
function floodFill3D(
  startPoint: Vector3,
  boundary: Box3,
  binarize: (p: Vector3) => boolean,
  fillLine: (p1: Vector3, p2: Vector3) => void,
  specfiedMarker?: LineMarker
) {
  if (!binarize(startPoint)) return;

  const stack: Vector3[] = [startPoint];
  const { min, max } = boundary;
  const { marks, marked } = specfiedMarker || bufferMarker(boundary);

  const stackPoints = (walker: Vector3, xend: number) => {
    let isScanLine = false;
    for (; walker.x <= xend; walker.x++) {
      const mustStack = !marked(walker) && binarize(walker);
      if (!isScanLine && mustStack) {
        stack.push(walker.clone());
        isScanLine = true;
      } else if (isScanLine && !mustStack) {
        isScanLine = false;
      }
    }
  };

  let maxStackLength = 0;
  while (stack.length > 0) {
    maxStackLength = Math.max(maxStackLength, stack.length);
    const cur = stack.shift()!;
    if (marked(cur)) continue;

    // x adjacent points of scan-line's endpoint
    let left = cur.clone();
    let right = cur.clone();

    // find start of scan-line
    do {
      left.x--;
    } while (min.x <= left.x && !marked(left) && binarize(left));
    // find start of scan-line
    do {
      right.x++;
    } while (right.x <= max.x && !marked(right) && binarize(right));

    // adjust the points to endpoint from theirs neighbor.
    left.x++;
    right.x--;

    // mark as scaned
    marks(left, right.x);
    // console.error(
    //   'Line: [' +
    //     left.toArray().toString() +
    //     '] to [' +
    //     right.toArray().toString() +
    //     ']'
    // );

    // process the line
    fillLine(left, right);

    // find scan-lines above the current one
    if (min.y < cur.y) {
      const walker = left.clone().setY(cur.y - 1);
      stackPoints(walker, right.x);
    }
    // find scan-lines below the current one
    if (cur.y < max.y) {
      const walker = left.clone().setY(cur.y + 1);
      stackPoints(walker, right.x);
    }
    // find scan-lines front the current one
    if (min.z < cur.z) {
      const walker = left.clone().setZ(cur.z - 1);
      stackPoints(walker, right.x);
    }
    // find scan-lines behind the current one
    if (cur.z < max.z) {
      const walker = left.clone().setZ(cur.z + 1);
      stackPoints(walker, right.x);
    }
  }
  console.log('maxStackLength');
  console.log(maxStackLength);
}

// https://github.com/ijpb/MorphoLibJ/blob/master/src/main/java/inra/ijpb/morphology/FloodFill3D.java
const test = (o: Vector3, s: Vector3, markArguments: [Vector3, number][]) => {
  const boundary = new Box3(o, o.clone().add(s));
  const check = ({ marks, marked }: LineMarker) => {
    markArguments.forEach(a => marks(...a));
    const dumper = markStateColDumper(marked);
    return dumper(boundary);
  };
  // const a = check(stupidMarker());
  const b = check(objectMarker());
  const c = check(bufferMarker(boundary));
  if (b !== c) {
    console.error('NOT MATCH MARKED');
    console.log(b);
    console.log(c);
  }
  return JSON.stringify([o, s, markArguments]);
};

// test(...randArg());

function randArg() {
  const r = (min: number, max: number) =>
    min + Math.round(Math.random() * (max - min));
  const o = new Vector3(r(0, 1000), r(0, 1000), r(0, 1000));
  const s = new Vector3(r(5, 12), r(5, 15), r(5, 10));
  const ufo = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);
  const points = new Array(20)
    .fill(null)
    .map(
      () => new Vector3(r(o.x, o.x + s.x), r(o.y, o.y + s.y), r(o.z, o.z + s.z))
    )
    .sort((a, b) => ufo(a.z, b.z) || ufo(a.y, b.y) || ufo(a.x, b.x));
  const markArguments: [Vector3, number][] = points.map(p => [
    p,
    r(p.x, o.x + s.x)
  ]);

  return [o, s, markArguments] as [typeof o, typeof s, typeof markArguments];
}

function testParam([o, s, markArguments]: any) {
  return [
    new Vector3(o.x, o.y, o.z),
    new Vector3(s.x, s.y, s.z),
    markArguments.map(([p, n]: any) => [new Vector3(p.x, p.y, p.z), n])
  ] as ReturnType<typeof randArg>;
}

// const start = new Vector3(2, 2, 2);
// const marker = stupidMarker();
// const dumper = markStateColDumper(marker.marked);
// let counter = 0;
// floodFill3D(
//   start,
//   boundary,
//   // (p: Vector3) => (p.x + p.y + p.z <= 7),
//   // (p: Vector3) => (p.x + p.y + p.z <= 7) && (p.y %2 === 0),
//   (p: Vector3) =>
//     Math.pow(p.x - start.x, 2) +
//       Math.pow(p.y - start.y, 2) +
//       Math.pow(p.z - start.z, 2) <=
//     Math.pow(2, 2),
//   (p1: Vector3, p2: Vector3) => {
//     ++counter;
//   },
//   marker
// );
// console.log(dumper(boundary));
