import { Vector2 } from 'three';

let shadowCanvas: HTMLCanvasElement | undefined = undefined;
export default function getShadowCanvas(
  resolution: Vector2
): HTMLCanvasElement {
  if (!(shadowCanvas instanceof HTMLCanvasElement)) {
    // Create new
    const canvas = document.createElement('canvas');
    canvas.width = resolution.x;
    canvas.height = resolution.y;
    shadowCanvas = canvas;
    return canvas;
  }

  // Use the existing one
  const canvas = shadowCanvas;
  // Setting the width/height of a canvas makes the canvas cleared
  if (canvas.width < resolution.x) canvas.width = resolution.x;
  if (canvas.height < resolution.y) canvas.height = resolution.y;
  return canvas;
}
