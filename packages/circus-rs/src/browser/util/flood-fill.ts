import { Vector2D } from '../../common/geometry';

/**
 * A very primitive 2D binary array interface
 */
export interface BinaryArrayView2D {
	get(pos: Vector2D): boolean;
	set(val: boolean, pos: Vector2D): void;
	width: number;
	height: number;
}

/**
 * A very primitive 2D array implementation which consumes 1 byte per pixel.
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

	public get(pos: Vector2D): boolean {
		return this.data[pos[1] * this.width + pos[0]] === 1;
	}

	public set(val: boolean, pos: Vector2D): void {
		this.data[pos[1] * this.width + pos[0]] = val ? 1 : 0;
	}

	public toString(): string {
		let result = '';
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				result += this.get([x, y]) ? '*' : ' ';
			}
			result += '\n';
		}
		return result;
	}
}

/**
 * Implements a basic flood-fill algorithm.
 * @return The number of pixels filled.
 */
export function floodFill(grid: BinaryArrayView2D, center: Vector2D): number {
	// https://en.wikipedia.org/wiki/Flood_fill
	const stack: Vector2D[] = [center];

	let minx = center[0], maxx = center[0];
	let miny = center[1], maxy = center[1];
	let filled = 0;

	while (stack.length > 0) {
		const cur = stack.pop();
		minx = cur[0] < minx ? cur[0] : minx;
		maxx = cur[0] > maxx ? cur[0] : maxx;

		if (grid.get(cur) === false) {
			let north = cur[1];
			let south = cur[1];

			do {
				north -= 1;
			} while (grid.get([cur[0], north]) === false && north >= 0)
			do {
				south += 1;
			} while (grid.get([cur[0], south]) === false && south < grid.height)

			miny = north + 1 < miny ? north + 1 : miny;
			maxy = south - 1 > maxy ? south - 1 : maxy;

			for (let n = north + 1; n < south; n++) {
				grid.set(true, [cur[0], n]);
				filled++;
				if (cur[0] > 0 && grid.get([cur[0] - 1, n]) === false) {
					stack.push([cur[0] - 1, n]);
				}
				if (cur[0] < grid.width - 1 && grid.get([cur[0] + 1, n]) === false) {
					stack.push([cur[0] + 1, n]);
				}
			}
		}
	}

	return filled;

}