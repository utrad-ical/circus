import { Vector3, Box3 } from 'three';
import createMarkedStateDumper from './createMarkedStateDumper';
import voxelMarker, { VoxelMarker } from './voxelMarker';

test('voxelMarker must work exactly', () => {
  for (let i = 0; i < 10; i++) {
    const [o, s, markArguments] = randArg();
    const boundary = new Box3(o, o.clone().add(s));

    const marker1 = objectMarker();
    markArguments.forEach(a => marker1.markVoxels(...a));
    const result1 = createMarkedStateDumper(marker1.marked)(boundary);

    const marker2 = voxelMarker(boundary);
    markArguments.forEach(a => marker2.markVoxels(...a));
    const result2 = createMarkedStateDumper(marker2.marked)(boundary);

    // console.log([o, s, markArguments]);
    // console.log(result1);

    expect(result2).toBe(result1);
  }
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
    r(p.x, o.x + s.x) - p.x + 1
  ]);

  return [o, s, markArguments] as [typeof o, typeof s, typeof markArguments];
};

const objectMarker = (): VoxelMarker => {
  const collection: Record<string, true> = {};
  const key = (p: Vector3): string =>
    p.x.toString() + ',' + p.y.toString() + ',' + p.z.toString();

  const markVoxels = (p: Vector3, xLength: number = 1) => {
    const cur = p.clone();
    const xEnd = p.x + xLength - 1;
    for (; cur.x <= xEnd; cur.x++) {
      collection[key(cur)] = true;
    }
  };
  const marked = (p: Vector3) => key(p) in collection;

  return { marked, markVoxels };
};
