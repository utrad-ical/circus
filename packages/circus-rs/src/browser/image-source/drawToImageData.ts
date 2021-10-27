import { applyWindow } from '../../common/pixel';
import Viewer from '../viewer/Viewer';

/**
 * Builds RGBA canvas imagedata from a grayscale image.
 * @param viewer The viewer instance on which the image will be drawn.
 * @param buffer Grayscale data (0-225) to draw on the canvas.
 * @returns The ImageData instance.
 */
export default function drawToImageData(
  viewer: Viewer,
  outSize: [number, number],
  buffer: Uint8Array | Uint8ClampedArray
): ImageData {
  const context = viewer.canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas context');

  if (!buffer || buffer.byteLength !== outSize[0] * outSize[1]) {
    throw TypeError('Invalid grayscale data');
  }
  const imageData = context.createImageData(outSize[0], outSize[1]);
  const pixelData = imageData.data;
  for (let srcIdx = 0; srcIdx < outSize[0] * outSize[1]; srcIdx++) {
    const pixel = buffer[srcIdx];
    const dstIdx = srcIdx * 4;
    pixelData[dstIdx] = pixel;
    pixelData[dstIdx + 1] = pixel;
    pixelData[dstIdx + 2] = pixel;
    pixelData[dstIdx + 3] = 0xff;
  }
  return imageData;
}

// HACK: Support-2d-image-source
export function drawToImageDataWithApplyWindow(
  viewer: Viewer,
  outSize: [number, number],
  buffer: Uint8Array | Uint8ClampedArray,
  windowWidth: number,
  windowLevel: number
): ImageData {
  const context = viewer.canvas.getContext('2d');
  if (!context) throw new Error('Failed to get canvas context');

  if (!buffer || buffer.byteLength !== outSize[0] * outSize[1]) {
    throw TypeError('Invalid grayscale data');
  }
  const imageData = context.createImageData(outSize[0], outSize[1]);
  const pixelData = imageData.data;
  for (let srcIdx = 0; srcIdx < outSize[0] * outSize[1]; srcIdx++) {
    const pixel = Math.round(
      applyWindow(windowWidth, windowLevel, buffer[srcIdx])
    );
    const dstIdx = srcIdx * 4;
    pixelData[dstIdx] = pixel;
    pixelData[dstIdx + 1] = pixel;
    pixelData[dstIdx + 2] = pixel;
    pixelData[dstIdx + 3] = 0xff;
  }
  return imageData;
}
