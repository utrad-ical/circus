import { TypedArray } from 'three';
import { ViewWindow } from '../../common/ViewWindow';
import Viewer from '../viewer/Viewer';

/**
 * Builds RGBA canvas ImageData from a grayscale bitmap data.
 * @param outSize The output size.
 * @param buffer Grayscale data (0-225) to draw on the canvas.
 * @param window If set, applies window width/length.
 * @returns A new ImageData instance.
 */
export default function drawToImageData(
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
