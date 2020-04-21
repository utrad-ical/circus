import { intersectsDirectedSegment, DirectedSegment } from './Line';
import { Vector2 } from 'three';

describe('intersectsDirectedSegment', () => {
  const check = (
    segment1: DirectedSegment,
    segment2: DirectedSegment,
    expected: boolean
  ) => {
    expect(intersectsDirectedSegment(segment1, segment2)).toBe(expected);
    expect(intersectsDirectedSegment(segment2, segment1)).toBe(expected);
  };
  const vec = (x: number, y: number) => new Vector2(x, y);
  const ds = (p1: Vector2, p2: Vector2) => ({ from: p1, to: p2 });

  describe('falsy cases', () => {
    test('not parallel', () => {
      check(ds(vec(0, 0), vec(1, 0)), ds(vec(1.001, 0), vec(2, 0)), false);
    });

    test('parallel and not on the same line', () => {
      check(ds(vec(0, 0), vec(0, 1)), ds(vec(1, 0), vec(1, 1)), false);
      check(ds(vec(0, 0), vec(2, 2)), ds(vec(0, 1), vec(2, 3)), false);
    });

    test('on the same line but not overlapping', () => {
      check(ds(vec(0, 0), vec(1, 0)), ds(vec(2, 0), vec(3, 0)), false);
      check(ds(vec(0, 0), vec(0, 1)), ds(vec(0, 2), vec(0, 3)), false);
      check(ds(vec(1, 1), vec(2, 2)), ds(vec(3, 3), vec(4, 4)), false);
    });

    test('on the same line and overlapping', () => {
      check(ds(vec(0, 0), vec(0, 1)), ds(vec(0, 0), vec(0, 1)), false);
      check(ds(vec(0, 0), vec(1, 0)), ds(vec(1, 0), vec(2, 0)), false);
      check(ds(vec(0, 0), vec(0, 1)), ds(vec(0, 1), vec(0, 2)), false);
      check(ds(vec(0, 0), vec(2, 0)), ds(vec(1, 0), vec(4, 0)), false);
      check(ds(vec(0, 0), vec(0, 2)), ds(vec(0, 1), vec(0, 4)), false);
      check(ds(vec(1, 1), vec(3, 3)), ds(vec(2, 2), vec(4, 4)), false);
    });

    test('length of a segment is 0', () => {
      check(ds(vec(0, 0), vec(2, 2)), ds(vec(1, 1), vec(1, 1)), false);
      check(ds(vec(0, 0), vec(0, 0)), ds(vec(0, 0), vec(1, 1)), false);
    });
  });

  test('truthy cases', () => {
    check(ds(vec(0, 0), vec(1, 0)), ds(vec(0, 0), vec(0, 1)), true);
    check(ds(vec(0, 0), vec(-1, 0)), ds(vec(0, 0), vec(0, -1)), true);
    check(ds(vec(0, 0), vec(1, 0)), ds(vec(1, 0), vec(1, 1)), true);
    check(ds(vec(0, 0), vec(1, 0)), ds(vec(1, -1), vec(1, 1)), true);
  });
});
