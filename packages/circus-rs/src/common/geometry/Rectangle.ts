import { Vector2D, Vector3D } from './Vector';

/**
 * Represents a bounding box.
 */
export interface Rectangle {
	origin: Vector2D;
	size: Vector2D;
}

export function rectangleEquals(rect1: Rectangle, rect2: Rectangle): boolean {
	return (
		rect1.origin[0] === rect2.origin[0] &&
		rect1.origin[1] === rect2.origin[1] &&
		rect1.size[0] === rect2.size[0] &&
		rect1.size[1] === rect2.size[1]
	);
}

/**
 * Calculates the intersection of the two given rectangles.
 * @param rect1
 * @param rect2
 */
export function intersectionOfTwoRectangles(rect1: Rectangle, rect2: Rectangle): Rectangle | null {
	const rect1right = rect1.origin[0] + rect1.size[0];
	const rect1bottom = rect1.origin[1] + rect1.size[1];
	const rect2right = rect2.origin[0] + rect2.size[0];
	const rect2bottom = rect2.origin[1] + rect2.size[1];

	if (
		rect1.origin[0] < rect2right && rect1right > rect2.origin[0] &&
		rect1.origin[1] < rect2bottom && rect1bottom > rect2.origin[1]
	) {
		const x = Math.max(rect1.origin[0], rect2.origin[0]);
		const y = Math.max(rect1.origin[1], rect2.origin[1]);
		const r = Math.min(rect1right, rect2right);
		const b = Math.min(rect1bottom, rect2bottom);
		return { origin: [x, y], size: [r - x, b - y] };
	} else {
		return null;
	}
}

export function growSubPixel(rect: Rectangle): Rectangle {
	const left = Math.floor(rect.origin[0]);
	const top = Math.floor(rect.origin[1]);
	const right = Math.ceil(rect.origin[0] + rect.size[0]);
	const bottom = Math.ceil(rect.origin[1] + rect.size[1]);
	return { origin: [left, top], size: [right - left, bottom - top] };
}