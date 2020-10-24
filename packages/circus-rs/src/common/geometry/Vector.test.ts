import * as vector from './Vector';
import { Vector2, Box2 } from 'three';

it('vector2ToPerpendicularClockwise', () => {
  expect(vector.vector2ToPerpendicularClockwise(new Vector2(5, -10))).toEqual(
    new Vector2(-10, -5)
  );
  expect(
    vector.vector2ToPerpendicularClockwise(new Vector2(5, -10), false)
  ).toEqual(new Vector2(-10, -5));

  expect(
    vector.vector2ToPerpendicularClockwise(new Vector2(5, -10), true)
  ).toEqual(new Vector2(10, 5));
});
