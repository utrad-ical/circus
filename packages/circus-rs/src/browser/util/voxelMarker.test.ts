import { Vector3, Box3 } from 'three';
import voxelMarker, { VoxelMarker } from './voxelMarker';

test.skip('voxelMarker must work exactly', () => {
  for (let i = 0; i < 10; i++) {
    const [o, s, markArguments] = randArg();
    const boundary = new Box3(o, o.clone().add(s));

    const marker1 = objectMarker();
    markArguments.forEach(a => marker1.marks(...a));
    const result1 = createMarkedStateDumper(marker1.marked)(boundary);

    const marker2 = voxelMarker(boundary);
    markArguments.forEach(a => marker2.marks(...a));
    const result2 = createMarkedStateDumper(marker2.marked)(boundary);

    // console.log([o, s, markArguments]);
    // console.log(result1);

    expect(result2).toBe(result1);
  }
});

test.skip('voxelMarker must work speedy enough', () => {
  const boundary = new Box3(new Vector3(0, 0, 0), new Vector3(500, 500, 500));
  const { marks, marked } = voxelMarker(boundary);

  const t0 = new Date().getTime();

  const { min, max } = boundary;

  console.time('write');
  for (let z = min.z; z <= max.z; z++) {
    for (let y = min.y; y <= max.y; y++) {
      for (let x = min.x; x <= max.x; x++) {
        marks(new Vector3(x, y, z), x);
      }
    }
  }
  console.timeEnd('write');

  console.time('read');
  for (let z = min.z; z <= max.z; z++) {
    for (let y = min.y; y <= max.y; y++) {
      for (let x = min.x; x <= max.x; x++) {
        marked(new Vector3(x, y, z));
      }
    }
  }
  console.timeEnd('read');

  const t1 = new Date().getTime();
  expect(t1 - t0).toBeLessThan(1500);
});

const randArg = () => {
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
};

const objectMarker = (): VoxelMarker => {
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

const createMarkedStateDumper = (marked: VoxelMarker['marked']) => {
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
