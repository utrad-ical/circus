import { Viewer } from '../viewer/viewer';

/**
 * Builds RGBA canvas imagedata from a grayscale image.
 * ImageData.
 * @param viewer
 * @param viewState
 * @returns {ImageData}
 */
export default function drawToImageData(
  viewer: Viewer,
  buffer: Uint8Array
): ImageData {
  const context = viewer.canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas context');
  const resolution = viewer.getResolution();

  if (!buffer || buffer.byteLength !== resolution[0] * resolution[1]) {
    throw TypeError('Scanned data is broken');
  }
  const imageData = context.createImageData(resolution[0], resolution[1]);
  const pixelData = imageData.data;
  for (let srcIdx = 0; srcIdx < resolution[0] * resolution[1]; srcIdx++) {
    const pixel = buffer[srcIdx];
    const dstIdx = srcIdx * 4;
    pixelData[dstIdx] = pixel;
    pixelData[dstIdx + 1] = pixel;
    pixelData[dstIdx + 2] = pixel;
    pixelData[dstIdx + 3] = 0xff;
  }
  return imageData;
}
