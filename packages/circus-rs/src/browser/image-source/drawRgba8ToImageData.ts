import Viewer from '../viewer/Viewer';

/**
 * Builds RGBA8 canvas imagedata from a RGBA image.
 * @param viewer The viewer instance on which the image will be drawn.
 * @param buffer32 RGBA8 data (RGBA8888) to draw on the canvas.
 * @returns The ImageData instance.
 */
export default function drawRgba8ToImageData(
  viewer: Viewer,
  outSize: [number, number],
  buffer32: Uint32Array,
): ImageData {
  const context = viewer.canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas context');

  if (!buffer32 || buffer32.byteLength !== outSize[0] * outSize[1] * 4) {
    throw TypeError('Invalid RGBA8 data');
  }

  const buffer8 = new Uint8ClampedArray(buffer32.buffer);
  const imageData = context.createImageData(outSize[0], outSize[1]);
  imageData.data.set(buffer8);

  return imageData;
}
