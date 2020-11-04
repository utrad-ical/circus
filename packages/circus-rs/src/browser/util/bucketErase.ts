import { Vector2 } from 'three';

/**
 * A very primitive 2D binary array interface.
 */
export interface BinaryArrayView2D {
  width: number;
  height: number;
  get(pos: Vector2): boolean;
  set(val: boolean, pos: Vector2): void;
}

/**
 * A very primitive 2D array implementation which consumes 1 byte per pixel.
 * Usable, but basically for testing purposes.
 */
export class BinaryArray2D implements BinaryArrayView2D {
  private data: Uint8Array;
  public width: number;
  public height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
  }

  public get(pos: Vector2): boolean {
    return this.data[pos.y * this.width + pos.x] === 1;
  }

  public set(val: boolean, pos: Vector2): void {
    this.data[pos.y * this.width + pos.x] = val ? 1 : 0;
  }

  public toString(): string {
    let result = '';
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        result += this.get(new Vector2(x, y)) ? '*' : ' ';
      }
      result += '\n';
    }
    return result;
  }
}

/**
 * Performs bucket erase on a 2D array represented by BinaryArrayView2D.
 * @return The number of pixels eraced.
 */
export default function bucketErase(
  grid: BinaryArrayView2D,
  center: Vector2
): number {
  const stack: Vector2[] = [center];

  let erased = 0;
  while (stack.length > 0) {
    const cur = <Vector2>stack.pop();

    if (grid.get(new Vector2(cur.x, cur.y)) === true) {
      let north = cur.y;
      let south = cur.y;

      do {
        north -= 1;
      } while (grid.get(new Vector2(cur.x, north)) === true && north >= 0);
      do {
        south += 1;
      } while (
        grid.get(new Vector2(cur.x, south)) === true &&
        south < grid.height
      );

      for (let n = north + 1; n < south; n++) {
        grid.set(false, new Vector2(cur.x, n));
        erased++;
        if (cur.x > 0 && grid.get(new Vector2(cur.x - 1, n)) === true) {
          stack.push(new Vector2(cur.x - 1, n));
        }
        if (
          cur.x < grid.width - 1 &&
          grid.get(new Vector2(cur.x + 1, n)) === true
        ) {
          stack.push(new Vector2(cur.x + 1, n));
        }
      }
    }
  }

  return erased;
}
