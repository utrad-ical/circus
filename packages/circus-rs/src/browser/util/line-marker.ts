import { write } from 'fs';
import { Vector3, Box3 } from 'three';

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
export const bufferMarker = (boundary: Box3): LineMarker => {
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
export const bitsMarker = (boundary: Box3): LineMarker => {
  const { min } = boundary;
  const [width, height, depth] = boundary
    .getSize(new Vector3())
    .addScalar(1)
    .toArray();

  const buffer = new Uint8Array(Math.ceil((width * height * depth) / 8));
  const getOffset = (p: Vector3) =>
    (p.z - min.z) * height * width + (p.y - min.y) * width + (p.x - min.x);

  // const mask = [1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5, 1 << 6, 1 << 7];
  // const write = (o: number) => (buffer[o >> 3] |= mask[o % 8]);
  // const read = (o: number) => (buffer[o >> 3] & mask[o % 8]) !== 0;

  const read = (pos: number) => (buffer[pos >> 3] >> (7 - (pos % 8))) & 1;
  const write = (pos: number) => {
    let cur = buffer[pos >> 3]; // pos => pos/8
    cur ^= (-1 ^ cur) & (1 << (7 - (pos % 8))); // set n-th bit to value
    buffer[pos >> 3] = cur;
  };

  const marks = (p: Vector3, xend: number) => {
    let offset = getOffset(p);
    for (let x = p.x; x <= xend; x++) {
      write(offset++);
    }
  };

  const marked = (p: Vector3) => {
    return read(getOffset(p)) === 1;
  };

  return { marked, marks };
};
export const objectMarker = (): LineMarker => {
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
export const stupidMarker = (): LineMarker => {
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

const test = (o: Vector3, s: Vector3, markArguments: [Vector3, number][]) => {
  const boundary = new Box3(o, o.clone().add(s));
  const check = ({ marks, marked }: LineMarker) => {
    markArguments.forEach(a => marks(...a));
    const dumper = markStateColDumper(marked);
    return dumper(boundary);
  };
  // const a = check(stupidMarker());
  const b = check(objectMarker());
  // const c = check(bufferMarker(boundary));
  const d = check(bitsMarker(boundary));
  if (b !== d) {
    console.error('NOT MATCH MARKED');
    console.log(b);
    console.log(d);
  }
  return JSON.stringify([o, s, markArguments]);
};
const bench = (title: string, { marks, marked }: LineMarker, box: Box3) => {
  console.log(title);
  console.time(title + ':write');
  const { min, max } = box;
  for (let z = min.z; z <= max.z; z++) {
    for (let y = min.y; y <= max.y; y++) {
      for (let x = min.x; x <= max.x; x++) {
        marks(new Vector3(x, y, z), x);
      }
    }
  }
  console.timeEnd(title + ':write');

  console.time(title + ':read');
  for (let z = min.z; z <= max.z; z++) {
    for (let y = min.y; y <= max.y; y++) {
      for (let x = min.x; x <= max.x; x++) {
        marked(new Vector3(x, y, z));
      }
    }
  }
  console.timeEnd(title + ':read');
};

// const bbb = new Box3(new Vector3(0, 0, 0), new Vector3(500, 500, 500));
// bench('objectMarker', objectMarker(), bbb);
// bench('bufferMarker', bufferMarker(bbb), bbb);
// bench('bitsMarker', bitsMarker(bbb), bbb);

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
