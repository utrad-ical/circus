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
 * Performs flood-fill on a 2D array represented by BinaryArrayView2D.
 * @return The number of pixels filled.
 */
export default function floodFill(
  grid: BinaryArrayView2D,
  center: Vector2
): number {
  // https://en.wikipedia.org/wiki/Flood_fill
  const stack: Vector2[] = [center];

  let minx = center.x,
    maxx = center.x;
  let miny = center.y,
    maxy = center.y;
  let filled = 0;

  while (stack.length > 0) {
    const cur = <Vector2>stack.pop();
    minx = cur.x < minx ? cur.x : minx;
    maxx = cur.x > maxx ? cur.x : maxx;

    if (grid.get(new Vector2(cur.x, cur.y)) === false) {
      let north = cur.y;
      let south = cur.y;

      do {
        north -= 1;
      } while (grid.get(new Vector2(cur.x, north)) === false && north >= 0);
      do {
        south += 1;
      } while (
        grid.get(new Vector2(cur.x, south)) === false &&
        south < grid.height
      );

      miny = north + 1 < miny ? north + 1 : miny;
      maxy = south - 1 > maxy ? south - 1 : maxy;

      for (let n = north + 1; n < south; n++) {
        grid.set(true, new Vector2(cur.x, n));
        filled++;
        if (cur.x > 0 && grid.get(new Vector2(cur.x - 1, n)) === false) {
          stack.push(new Vector2(cur.x - 1, n));
        }
        if (
          cur.x < grid.width - 1 &&
          grid.get(new Vector2(cur.x + 1, n)) === false
        ) {
          stack.push(new Vector2(cur.x + 1, n));
        }
      }
    }
  }

  return filled;
}
