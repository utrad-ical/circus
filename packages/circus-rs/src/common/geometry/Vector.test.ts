import assert from 'node:assert/strict';
import { it } from 'node:test';
import * as vector from './Vector.ts';
import { Vector2, Box2 } from 'three';

it('vector2ToPerpendicularClockwise', () => {
  assert.deepEqual(
    vector.vector2ToPerpendicularClockwise(new Vector2(5, -10)),
    new Vector2(-10, -5)
  );
  assert.deepEqual(
    vector.vector2ToPerpendicularClockwise(new Vector2(5, -10), false),
    new Vector2(-10, -5)
  );

  assert.deepEqual(
    vector.vector2ToPerpendicularClockwise(new Vector2(5, -10), true),
    new Vector2(10, 5)
  );
});
