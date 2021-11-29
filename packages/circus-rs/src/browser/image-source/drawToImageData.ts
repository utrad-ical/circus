import { TypedArray } from 'three';
import { ViewWindow } from '../../common/ViewWindow';
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
 * Builds RGBA canvas ImageData from a grayscale bitmap data.
 * @param outSize The output size.
 * @param buffer Grayscale data (0-225) to draw on the canvas.
 * @param window If set, applies window width/length.
 * @returns A new ImageData instance.
 */
export function drawToImageDataWithWindow(
  outSize: [number, number],
  buffer: TypedArray,
  window?: ViewWindow
): ImageData {
  if (!buffer || buffer.length !== outSize[0] * outSize[1]) {
    throw TypeError('Invalid grayscale data');
  }

  const [w, h] = outSize;
  const imageData = new ImageData(w, h);
  const pixelData = imageData.data;
  const len = buffer.byteLength;
  for (let srcIdx = 0; srcIdx < len; srcIdx++) {
    const value = window
      ? (255 * (buffer[srcIdx] - window.level)) / window.width + 127.5
      : buffer[srcIdx];
    const dstIdx = srcIdx * 4;
    pixelData[dstIdx] = value;
    pixelData[dstIdx + 1] = value;
    pixelData[dstIdx + 2] = value;
    pixelData[dstIdx + 3] = 0xff; // opaque
  }
  return imageData;
}
