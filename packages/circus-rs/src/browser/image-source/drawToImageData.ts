import { TypedArray } from 'three';
import { ViewWindow } from '..';
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

/**
 * Builds RGBA canvas imagedata from a grayscale image.
 * @param viewer The viewer instance on which the image will be drawn.
 * @param buffer Grayscale data (0-225) to draw on the canvas.
 * @param window Specifies how to assign the value of each pixel to a grayscale value on the screen.
 * @returns The ImageData instance.
 */
export function drawToImageDataFor2D(
  outSize: [number, number],
  buffer: TypedArray,
  window?: ViewWindow
): ImageData {
  if (!buffer || buffer.length !== outSize[0] * outSize[1]) {
    throw TypeError('Invalid grayscale data');
  }

  const [w, h] = outSize;
  const pixelData = new Uint8ClampedArray(w * h * 4);
  for (let srcIdx = 0; srcIdx < buffer.byteLength; srcIdx++) {
    let pixel = buffer[srcIdx];
    if (window) {
      pixel = applyWindow(window.width, window.level, buffer[srcIdx]);
    }
    const dstIdx = srcIdx * 4;
    pixelData[dstIdx] = pixel;
    pixelData[dstIdx + 1] = pixel;
    pixelData[dstIdx + 2] = pixel;
    pixelData[dstIdx + 3] = 0xff;
  }

  const imageData = new ImageData(w, h);
  imageData.data.set(pixelData);

  return imageData;
}
