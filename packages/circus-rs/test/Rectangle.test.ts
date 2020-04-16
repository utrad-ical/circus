import * as geo from '../src/common/geometry';
import { Vector2, Box2 } from 'three';

describe('fitRectangle', () => {
  it('calculates fitting when the aspect ratio of two rects are the same', () => {
    expect(
      geo
        .fitRectangle(new Vector2(3, 3), new Vector2(3, 3))
        .equals(new Box2(new Vector2(0, 0), new Vector2(3, 3)))
    ).toBe(true);
    expect(
      geo
        .fitRectangle(new Vector2(1, 1), new Vector2(2, 2))
        .equals(new Box2(new Vector2(0, 0), new Vector2(1, 1)))
    ).toBe(true);
    expect(
      geo
        .fitRectangle(new Vector2(5, 10), new Vector2(1, 2))
        .equals(new Box2(new Vector2(0, 0), new Vector2(5, 10)))
    ).toBe(true);
  });

  it('calculates fitting when the outer rect is wider', () => {
    expect(
      geo
        .fitRectangle(new Vector2(3, 1), new Vector2(1, 1))
        .equals(new Box2(new Vector2(1, 0), new Vector2(2, 1)))
    ).toBe(true);
    expect(
      geo
        .fitRectangle(new Vector2(6, 1), new Vector2(4, 2))
        .equals(new Box2(new Vector2(2, 0), new Vector2(4, 1)))
    ).toBe(true);
  });

  it('calculates fitting when the outer rect is taller', () => {
    expect(
      geo
        .fitRectangle(new Vector2(1, 3), new Vector2(1, 1))
        .equals(new Box2(new Vector2(0, 1), new Vector2(1, 2)))
    ).toBe(true);
    expect(
      geo
        .fitRectangle(new Vector2(1, 6), new Vector2(2, 4))
        .equals(new Box2(new Vector2(0, 2), new Vector2(1, 4)))
    ).toBe(true);
  });
});
