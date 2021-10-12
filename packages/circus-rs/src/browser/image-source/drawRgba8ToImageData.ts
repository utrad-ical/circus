import Viewer from '../viewer/Viewer';

/**
 * Builds RGBA8 canvas imagedata from a grayscale image.
 * @param viewer The viewer instance on which the image will be drawn.
 * @param buffer RGBA8 data (RGBA8888) to draw on the canvas.
 * @returns The ImageData instance.
 */
export default function drawRgba8ToImageData(
  viewer: Viewer,
  outSize: [number, number],
  buffer: Uint32Array
): ImageData {
  const context = viewer.canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas context');

  if (!buffer || buffer.byteLength !== outSize[0] * outSize[1] * 4) {
    throw TypeError('Invalid RGBA8 data');
  }
  const imageData = context.createImageData(outSize[0], outSize[1]);
  const imageDataArray = new Uint32Array(imageData.data.buffer);
  for (let i = 0; i < buffer.length; i++) {
    imageDataArray[i] = buffer[i];
  }
  return imageData;
}
